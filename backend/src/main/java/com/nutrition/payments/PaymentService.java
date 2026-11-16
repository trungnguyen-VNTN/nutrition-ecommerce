package com.nutrition.payments;

import com.nutrition.common.BusinessException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * VNPAY sandbox payments (D27). Only a signed IPN changes the database; the browser return only
 * reports. Amounts are always compared with the order stored in the database. Identity for creating
 * a payment comes from the JWT (invariant 1). The hash secret is never logged (invariant 4).
 */
@Service
public class PaymentService {
  private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
  static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
  private static final DateTimeFormatter VNPAY_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
  private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  /** IPN answer VNPAY expects: {"RspCode":"00","Message":"..."}. */
  public record IpnResponse(String rspCode, String message) {}

  /** What the return page may show; read from the database, never trusted from the browser. */
  public record ReturnResult(
      long orderId, String gatewayCode, String paymentStatus, String orderStatus) {}

  private final JdbcTemplate db;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();
  private final String tmnCode;
  private final VnpaySigner signer;
  private final String payUrl;
  private final String returnUrl;

  @org.springframework.beans.factory.annotation.Autowired
  public PaymentService(
      JdbcTemplate db,
      @Value("${nutrition.vnpay.tmn-code:}") String tmnCode,
      @Value("${nutrition.vnpay.hash-secret:}") String hashSecret,
      @Value("${nutrition.vnpay.pay-url}") String payUrl,
      @Value("${nutrition.vnpay.return-url}") String returnUrl) {
    this(db, Clock.systemUTC(), tmnCode, hashSecret, payUrl, returnUrl);
  }

  PaymentService(
      JdbcTemplate db,
      Clock clock,
      String tmnCode,
      String hashSecret,
      String payUrl,
      String returnUrl) {
    this.db = db;
    this.clock = clock;
    this.tmnCode = tmnCode == null ? "" : tmnCode;
    this.signer = hashSecret == null || hashSecret.isBlank() ? null : new VnpaySigner(hashSecret);
    this.payUrl = payUrl;
    this.returnUrl = returnUrl;
  }

  public boolean vnpayEnabled() {
    return !tmnCode.isBlank() && signer != null;
  }

  public List<String> methods() {
    return vnpayEnabled() ? List.of("COD", "VNPAY") : List.of("COD");
  }

  /** Creates a payment attempt for the caller's own order and returns the VNPAY URL. */
  @Transactional
  public String createVnpayUrl(UUID user, long orderId, String clientIp) {
    if (!vnpayEnabled())
      throw new BusinessException("PAYMENT_UNAVAILABLE", "Thanh toán VNPAY chưa được cấu hình.");
    var rows =
        db.queryForList(
            "SELECT status,payment_method,total,payment_expires_at FROM orders"
                + " WHERE id=? AND user_id=? FOR UPDATE",
            orderId,
            user);
    if (rows.isEmpty()) throw new NoSuchElementException();
    var order = rows.getFirst();
    var expires = (java.time.OffsetDateTime) toOffset(order.get("payment_expires_at"));
    if (!"VNPAY".equals(order.get("payment_method"))
        || !"AWAITING_PAYMENT".equals(order.get("status"))
        || expires == null
        || !expires.isAfter(OffsetDateTime.now(clock).plusMinutes(1)))
      throw new BusinessException("PAYMENT_NOT_ALLOWED", "Đơn này không còn chờ thanh toán.");
    BigDecimal total = (BigDecimal) order.get("total");
    String txnRef = orderId + "N" + randomCode(8);
    db.update(
        "INSERT INTO payments(order_id,provider,txn_ref,amount,status) VALUES (?,'VNPAY',?,?,'PENDING')",
        orderId,
        txnRef,
        total);
    Map<String, String> params = new LinkedHashMap<>();
    params.put("vnp_Version", "2.1.0");
    params.put("vnp_Command", "pay");
    params.put("vnp_TmnCode", tmnCode);
    params.put("vnp_Amount", toVnpayAmount(total));
    params.put("vnp_CurrCode", "VND");
    params.put("vnp_TxnRef", txnRef);
    // Unaccented text without special characters, as VNPAY requires.
    params.put("vnp_OrderInfo", "Thanh toan don hang " + orderId);
    params.put("vnp_OrderType", "other");
    params.put("vnp_Locale", "vn");
    params.put("vnp_ReturnUrl", returnUrl);
    params.put("vnp_IpAddr", clientIp);
    params.put(
        "vnp_CreateDate", OffsetDateTime.now(clock).atZoneSameInstant(VIETNAM).format(VNPAY_TIME));
    params.put("vnp_ExpireDate", expires.atZoneSameInstant(VIETNAM).format(VNPAY_TIME));
    log.info("VNPAY payment {} created for order {}", txnRef, orderId);
    return payUrl + "?" + signer.signedQuery(params);
  }

  /**
   * IPN, in VNPAY's required order: checksum (97), order (01), amount (04), already handled (02),
   * then update and confirm (00). Repeated IPNs are safe.
   */
  @Transactional
  public IpnResponse handleIpn(Map<String, String> params) {
    if (!vnpayEnabled()) return new IpnResponse("99", "Unknown error");
    if (!signer.verify(params)) return new IpnResponse("97", "Invalid signature");
    String txnRef = params.get("vnp_TxnRef");
    var payments =
        db.queryForList(
            "SELECT id,order_id,amount,status FROM payments WHERE txn_ref=? FOR UPDATE", txnRef);
    if (payments.isEmpty()) return new IpnResponse("01", "Order not found");
    var payment = payments.getFirst();
    long orderId = ((Number) payment.get("order_id")).longValue();
    String expectedAmount = toVnpayAmount((BigDecimal) payment.get("amount"));
    if (!expectedAmount.equals(params.get("vnp_Amount")))
      return new IpnResponse("04", "Invalid amount");
    if (!"PENDING".equals(payment.get("status")))
      return new IpnResponse("02", "Order already confirmed");

    boolean paid =
        "00".equals(params.get("vnp_ResponseCode"))
            && "00".equals(params.get("vnp_TransactionStatus"));
    db.update(
        "UPDATE payments SET status=?,response_code=?,transaction_no=?,bank_code=?,updated_at=now()"
            + " WHERE id=?",
        paid ? "SUCCEEDED" : "FAILED",
        params.get("vnp_ResponseCode"),
        params.get("vnp_TransactionNo"),
        params.get("vnp_BankCode"),
        payment.get("id"));
    if (paid) {
      String status =
          db.queryForObject(
              "SELECT status FROM orders WHERE id=? FOR UPDATE", String.class, orderId);
      if ("AWAITING_PAYMENT".equals(status))
        db.update(
            "UPDATE orders SET status='PLACED',payment_status='PAID',updated_at=now() WHERE id=?",
            orderId);
      else {
        // Money arrived for an order that already expired, was cancelled or was paid by another
        // attempt: keep it visible so an admin refunds it instead of losing it silently.
        db.update(
            "UPDATE orders SET payment_status='REFUND_NEEDED',updated_at=now() WHERE id=?",
            orderId);
        log.warn(
            "VNPAY payment {} succeeded for order {} in status {}: refund needed",
            txnRef,
            orderId,
            status);
      }
    }
    log.info("VNPAY IPN {} for order {}: {}", txnRef, orderId, paid ? "paid" : "failed");
    return new IpnResponse("00", "Confirm Success");
  }

  /** Browser return: checks the signature and reports the stored state; changes nothing. */
  @Transactional(readOnly = true)
  public ReturnResult returnResult(Map<String, String> params) {
    if (!vnpayEnabled() || !signer.verify(params))
      throw new IllegalArgumentException("Invalid signature");
    var rows =
        db.queryForList(
            "SELECT o.id,o.status,o.payment_status FROM payments p JOIN orders o ON o.id=p.order_id"
                + " WHERE p.txn_ref=?",
            params.get("vnp_TxnRef"));
    if (rows.isEmpty()) throw new NoSuchElementException();
    var row = rows.getFirst();
    return new ReturnResult(
        ((Number) row.get("id")).longValue(),
        params.get("vnp_ResponseCode"),
        (String) row.get("payment_status"),
        (String) row.get("status"));
  }

  /** Cancels unpaid VNPAY orders a few minutes after their payment window and returns the stock. */
  @Transactional
  public int expireUnpaid(int graceMinutes) {
    List<Long> ids =
        db.queryForList(
            "SELECT id FROM orders WHERE status='AWAITING_PAYMENT' AND payment_expires_at < ?"
                + " ORDER BY id FOR UPDATE SKIP LOCKED",
            Long.class,
            OffsetDateTime.now(clock).minusMinutes(graceMinutes));
    for (long id : ids) {
      var items =
          db.queryForList(
              "SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id",
              id);
      for (var item : items)
        db.update(
            "UPDATE products SET stock=stock+?,updated_at=now() WHERE id=?",
            item.get("quantity"),
            item.get("product_id"));
      db.update("UPDATE orders SET status='CANCELLED',updated_at=now() WHERE id=?", id);
    }
    if (!ids.isEmpty()) log.info("Expired {} unpaid VNPAY orders", ids.size());
    return ids.size();
  }

  static String toVnpayAmount(BigDecimal total) {
    // VND has no minor unit; VNPAY wants the amount multiplied by 100.
    return total.multiply(BigDecimal.valueOf(100)).toBigIntegerExact().toString();
  }

  private String randomCode(int length) {
    StringBuilder code = new StringBuilder(length);
    for (int i = 0; i < length; i++)
      code.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
    return code.toString();
  }

  private static OffsetDateTime toOffset(Object value) {
    if (value == null) return null;
    if (value instanceof OffsetDateTime odt) return odt;
    if (value instanceof java.sql.Timestamp ts)
      return ts.toInstant().atOffset(java.time.ZoneOffset.UTC);
    throw new IllegalStateException("Unexpected time type " + value.getClass());
  }
}
