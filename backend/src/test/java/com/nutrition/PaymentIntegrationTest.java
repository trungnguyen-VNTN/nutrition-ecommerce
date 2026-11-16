package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nutrition.commerce.CommerceService;
import com.nutrition.payments.PaymentService;
import com.nutrition.payments.VnpaySigner;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** VNPAY sandbox flow (D27) with a test secret: only a signed, matching IPN marks an order paid. */
@SpringBootTest(
    properties = {
      "nutrition.vnpay.tmn-code=TESTTMN1",
      "nutrition.vnpay.hash-secret=TESTSECRET",
      "nutrition.vnpay.expiry-job=false"
    })
@AutoConfigureMockMvc
@ActiveProfiles("local")
class PaymentIntegrationTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  @Autowired CommerceService commerce;
  @Autowired PaymentService payments;
  private final VnpaySigner signer = new VnpaySigner("TESTSECRET");
  private final UUID owner = UUID.randomUUID();
  private final UUID stranger = UUID.randomUUID();
  private long product;

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active) VALUES ('pay-test',69000,5,true) RETURNING id",
            Long.class);
  }

  @AfterEach
  void cleanup() {
    db.update(
        "DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (?,?))",
        owner,
        stranger);
    db.update(
        "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (?,?))",
        owner,
        stranger);
    db.update("DELETE FROM orders WHERE user_id IN (?,?)", owner, stranger);
    db.update(
        "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (?,?))",
        owner,
        stranger);
    db.update("DELETE FROM carts WHERE user_id IN (?,?)", owner, stranger);
    db.update("DELETE FROM app_users WHERE id IN (?,?)", owner, stranger);
    db.update("DELETE FROM products WHERE id=?", product);
  }

  private long vnpayOrder(int quantity) {
    commerce.put(owner, product, quantity, true);
    return commerce.checkout(owner, UUID.randomUUID(), "A", "0900000000", "Addr", "VNPAY");
  }

  private MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request, UUID user) {
    return request.with(jwt().jwt(j -> j.subject(user.toString())));
  }

  /** Creates a payment through the API and returns the signed parameters VNPAY received. */
  private Map<String, String> startPayment(long order) throws Exception {
    String body =
        http.perform(as(post("/api/orders/" + order + "/payments/vnpay"), owner))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String url = body.replaceAll(".*\"payment_url\":\"([^\"]+)\".*", "$1");
    Map<String, String> params = new HashMap<>();
    for (String pair : URI.create(url).getRawQuery().split("&")) {
      String[] kv = pair.split("=", 2);
      params.put(kv[0], URLDecoder.decode(kv[1], StandardCharsets.US_ASCII));
    }
    return params;
  }

  /** A callback as VNPAY would send it, signed with the merchant secret. */
  private Map<String, String> callback(
      Map<String, String> sent, String amount, String responseCode) {
    Map<String, String> params = new HashMap<>();
    params.put("vnp_TmnCode", sent.get("vnp_TmnCode"));
    params.put("vnp_TxnRef", sent.get("vnp_TxnRef"));
    params.put("vnp_Amount", amount);
    params.put("vnp_ResponseCode", responseCode);
    params.put("vnp_TransactionStatus", responseCode);
    params.put("vnp_TransactionNo", "14000001");
    params.put("vnp_BankCode", "NCB");
    params.put("vnp_OrderInfo", sent.get("vnp_OrderInfo"));
    params.put("vnp_SecureHash", signer.sign(params));
    params.put("vnp_SecureHashType", "HmacSHA512");
    return params;
  }

  private String ipn(Map<String, String> params) throws Exception {
    var request = get("/api/payments/vnpay/ipn");
    params.forEach(request::param);
    return http.perform(request)
        .andExpect(status().isOk())
        .andReturn()
        .getResponse()
        .getContentAsString();
  }

  private String orderField(long order, String column) {
    return db.queryForObject("SELECT " + column + " FROM orders WHERE id=?", String.class, order);
  }

  private int stock() {
    return db.queryForObject("SELECT stock FROM products WHERE id=?", Integer.class, product);
  }

  @Test
  void aVnpayOrderHoldsStockAndBuildsASignedUrl() throws Exception {
    long order = vnpayOrder(2);
    assertThat(orderField(order, "status")).isEqualTo("AWAITING_PAYMENT");
    assertThat(stock()).isEqualTo(3);
    Map<String, String> sent = startPayment(order);
    assertThat(sent)
        .containsEntry("vnp_Version", "2.1.0")
        .containsEntry("vnp_Command", "pay")
        .containsEntry("vnp_TmnCode", "TESTTMN1")
        .containsEntry("vnp_Amount", "13800000")
        .containsEntry("vnp_CurrCode", "VND");
    assertThat(sent.get("vnp_CreateDate")).matches("\\d{14}");
    assertThat(sent.get("vnp_ExpireDate")).matches("\\d{14}");
    assertThat(signer.verify(sent)).isTrue();
    // Only the owner can start a payment for the order.
    http.perform(as(post("/api/orders/" + order + "/payments/vnpay"), stranger))
        .andExpect(status().isNotFound());
  }

  @Test
  void ipnFollowsVnpaysCheckOrderAndIsSafeToRepeat() throws Exception {
    long order = vnpayOrder(1);
    Map<String, String> sent = startPayment(order);

    Map<String, String> tampered = callback(sent, "6900000", "00");
    tampered.put("vnp_ResponseCode", "24");
    assertThat(ipn(tampered)).contains("\"RspCode\":\"97\"");

    Map<String, String> unknown = callback(sent, "6900000", "00");
    unknown.put("vnp_TxnRef", "999NZZZZZZZZ");
    unknown.put("vnp_SecureHash", signer.sign(unknown));
    assertThat(ipn(unknown)).contains("\"RspCode\":\"01\"");

    assertThat(ipn(callback(sent, "100", "00"))).contains("\"RspCode\":\"04\"");
    assertThat(orderField(order, "status")).isEqualTo("AWAITING_PAYMENT");

    assertThat(ipn(callback(sent, "6900000", "00"))).contains("\"RspCode\":\"00\"");
    assertThat(orderField(order, "status")).isEqualTo("PLACED");
    assertThat(orderField(order, "payment_status")).isEqualTo("PAID");

    // VNPAY retries until it gets 00 or 02; a repeat changes nothing.
    assertThat(ipn(callback(sent, "6900000", "00"))).contains("\"RspCode\":\"02\"");
    assertThat(stock()).isEqualTo(4);
  }

  @Test
  void aFailedPaymentLeavesTheOrderWaitingAndTheReturnPageChangesNothing() throws Exception {
    long order = vnpayOrder(1);
    Map<String, String> sent = startPayment(order);
    Map<String, String> cancelled = callback(sent, "6900000", "24");

    var returnRequest = get("/api/payments/vnpay/return");
    callback(sent, "6900000", "00").forEach(returnRequest::param);
    // A successful-looking return before any IPN does not mark the order paid.
    http.perform(returnRequest)
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.order_id").value(order))
        .andExpect(jsonPath("$.gateway_code").value("00"))
        .andExpect(jsonPath("$.payment_status").value("UNPAID"))
        .andExpect(jsonPath("$.order_status").value("AWAITING_PAYMENT"));

    assertThat(ipn(cancelled)).contains("\"RspCode\":\"00\"");
    assertThat(orderField(order, "status")).isEqualTo("AWAITING_PAYMENT");
    assertThat(orderField(order, "payment_status")).isEqualTo("UNPAID");

    var forged = get("/api/payments/vnpay/return");
    callback(sent, "6900000", "00")
        .forEach((k, v) -> forged.param(k, k.equals("vnp_Amount") ? "1" : v));
    http.perform(forged).andExpect(status().isBadRequest());
  }

  @Test
  void expiryReturnsStockOnceAndALatePaymentIsFlaggedForRefund() throws Exception {
    long order = vnpayOrder(2);
    Map<String, String> sent = startPayment(order);
    db.update(
        "UPDATE orders SET payment_expires_at=now() - interval '30 minutes' WHERE id=?", order);
    assertThat(payments.expireUnpaid(5)).isGreaterThanOrEqualTo(1);
    payments.expireUnpaid(5);
    assertThat(orderField(order, "status")).isEqualTo("CANCELLED");
    assertThat(stock()).isEqualTo(5);

    assertThat(ipn(callback(sent, "13800000", "00"))).contains("\"RspCode\":\"00\"");
    assertThat(orderField(order, "status")).isEqualTo("CANCELLED");
    assertThat(orderField(order, "payment_status")).isEqualTo("REFUND_NEEDED");
    assertThat(stock()).isEqualTo(5);
  }

  @Test
  void cancellingAPaidOrderMarksItForRefundAndCodIsUnchanged() throws Exception {
    long order = vnpayOrder(1);
    Map<String, String> sent = startPayment(order);
    ipn(callback(sent, "6900000", "00"));
    commerce.cancel(owner, order);
    assertThat(orderField(order, "payment_status")).isEqualTo("REFUND_NEEDED");

    commerce.put(owner, product, 1, true);
    long cod = commerce.checkout(owner, UUID.randomUUID(), "A", "0900000000", "Addr");
    assertThat(orderField(cod, "status")).isEqualTo("PLACED");
    assertThat(orderField(cod, "payment_method")).isEqualTo("COD");
    http.perform(as(post("/api/orders/" + cod + "/payments/vnpay"), owner))
        .andExpect(status().isConflict());
    http.perform(get("/api/payments/methods"))
        .andExpect(jsonPath("$[0]").value("COD"))
        .andExpect(jsonPath("$[1]").value("VNPAY"));
  }
}
