package com.nutrition.commerce;

import com.nutrition.common.BusinessException;
import com.nutrition.images.ImageUrls;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommerceService {
  private final JdbcTemplate db;
  private final ImageUrls imageUrls;

  public CommerceService(JdbcTemplate db, ImageUrls imageUrls) {
    this.db = db;
    this.imageUrls = imageUrls;
  }

  public record Item(
      long productId,
      String name,
      BigDecimal price,
      String currency,
      int stock,
      int quantity,
      boolean active,
      String imageUrl) {}

  public record Cart(List<Item> items, BigDecimal total) {}

  private long lockCart(UUID user) {
    db.update("INSERT INTO app_users(id) VALUES (?) ON CONFLICT DO NOTHING", user);
    db.update("INSERT INTO carts(user_id) VALUES (?) ON CONFLICT DO NOTHING", user);
    return db.queryForObject("SELECT id FROM carts WHERE user_id=? FOR UPDATE", Long.class, user);
  }

  private List<Item> items(long cart) {
    return db.query(
        """
        SELECT p.id,p.name,p.price,p.currency,p.stock,c.quantity,p.active,
        (SELECT i.s3_key FROM product_images i WHERE i.product_id=p.id
         ORDER BY i.sort_order,i.id LIMIT 1) AS image_key
        FROM cart_items c
        JOIN products p ON p.id=c.product_id WHERE c.cart_id=? ORDER BY p.id
        """,
        (rs, row) ->
            new Item(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getBigDecimal("price"),
                rs.getString("currency"),
                rs.getInt("stock"),
                rs.getInt("quantity"),
                rs.getBoolean("active"),
                rs.getString("image_key") == null
                    ? null
                    : imageUrls.url(rs.getString("image_key"))),
        cart);
  }

  @Transactional
  public Cart cart(UUID user) {
    var items = items(lockCart(user));
    return new Cart(
        items,
        items.stream()
            .map(i -> i.price.multiply(BigDecimal.valueOf(i.quantity)))
            .reduce(BigDecimal.ZERO, BigDecimal::add));
  }

  @Transactional
  public void put(UUID user, long product, int quantity, boolean add) {
    long cart = lockCart(user);
    int existing =
        db.queryForObject(
            "SELECT COALESCE(SUM(quantity),0) FROM cart_items WHERE cart_id=? AND product_id=?",
            Integer.class,
            cart,
            product);
    int target = quantity + (add ? existing : 0);
    if (target < 1 || target > 99) throw new IllegalArgumentException();
    var stock =
        db.queryForList(
            "SELECT stock FROM products WHERE id=? AND active FOR UPDATE", Integer.class, product);
    if (stock.isEmpty()) throw new NoSuchElementException();
    if (target > stock.getFirst())
      throw new BusinessException("OUT_OF_STOCK", "Số lượng vượt tồn kho.");
    db.update(
        "INSERT INTO cart_items(cart_id,product_id,quantity) VALUES (?,?,?) ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity",
        cart,
        product,
        target);
  }

  @Transactional
  public void remove(UUID user, long product) {
    db.update("DELETE FROM cart_items WHERE cart_id=? AND product_id=?", lockCart(user), product);
  }

  /** Minutes a VNPAY order holds its stock; VNPAY rejects payment after this (D27). */
  static final int PAYMENT_HOLD_MINUTES = 15;

  @Transactional
  public long checkout(UUID user, UUID key, String name, String phone, String address) {
    return checkout(user, key, name, phone, address, "COD");
  }

  @Transactional
  public long checkout(
      UUID user, UUID key, String name, String phone, String address, String paymentMethod) {
    boolean online = "VNPAY".equals(paymentMethod);
    long cart = lockCart(user);
    var previous =
        db.queryForList(
            "SELECT id FROM orders WHERE user_id=? AND request_key=?", Long.class, user, key);
    if (!previous.isEmpty()) return previous.getFirst();
    // Lock products in a stable order before reading prices or updating inventory.
    db.queryForList(
        "SELECT p.id FROM products p JOIN cart_items c ON c.product_id=p.id WHERE c.cart_id=? ORDER BY p.id FOR UPDATE OF p",
        cart);
    var items = items(cart);
    if (items.isEmpty()) throw new BusinessException("EMPTY_CART", "Giỏ hàng đang trống.");
    String currency = items.getFirst().currency;
    if (items.stream().anyMatch(i -> !i.currency.equals(currency)))
      throw new BusinessException("MIXED_CURRENCY", "Giỏ hàng chứa nhiều loại tiền tệ.");
    BigDecimal total = BigDecimal.ZERO;
    for (var item : items) {
      int changed =
          db.update(
              "UPDATE products SET stock=stock-?,updated_at=now() WHERE id=? AND active AND stock>=?",
              item.quantity,
              item.productId,
              item.quantity);
      if (changed != 1)
        throw new BusinessException("OUT_OF_STOCK", "Sản phẩm đã hết hàng hoặc ngừng bán.");
      total = total.add(item.price.multiply(BigDecimal.valueOf(item.quantity)));
    }
    long order =
        db.queryForObject(
            """
        INSERT INTO orders(user_id,status,total,currency,shipping_name,phone,address,request_key,
                           payment_method,payment_expires_at)
        VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN ? THEN now() + make_interval(mins => ?) END)
        RETURNING id
        """,
            Long.class,
            user,
            online ? "AWAITING_PAYMENT" : "PLACED",
            total,
            currency,
            name,
            phone,
            address,
            key,
            online ? "VNPAY" : "COD",
            online,
            PAYMENT_HOLD_MINUTES);
    for (var item : items)
      db.update(
          "INSERT INTO order_items(order_id,product_id,name_snapshot,unit_price,quantity) VALUES (?,?,?,?,?)",
          order,
          item.productId,
          item.name,
          item.price,
          item.quantity);
    db.update("DELETE FROM cart_items WHERE cart_id=?", cart);
    return order;
  }

  public List<Map<String, Object>> orders(UUID user, int page, int size) {
    return db.queryForList(
        "SELECT id,status,total,currency,created_at,payment_method,payment_status FROM orders WHERE user_id=? ORDER BY id DESC LIMIT ? OFFSET ?",
        user,
        size,
        (long) page * size);
  }

  public Map<String, Object> order(UUID user, long id) {
    var rows =
        db.queryForList(
            "SELECT id,status,total,currency,shipping_name,phone,address,created_at,payment_method,payment_status,payment_expires_at FROM orders WHERE user_id=? AND id=?",
            user,
            id);
    if (rows.isEmpty()) throw new NoSuchElementException();
    var result = rows.getFirst();
    result.put(
        "items",
        db.queryForList(
            "SELECT product_id,name_snapshot,unit_price,quantity FROM order_items WHERE order_id=? ORDER BY product_id",
            id));
    return result;
  }

  @Transactional
  public void cancel(UUID user, long id) {
    var statuses =
        db.queryForList(
            "SELECT status FROM orders WHERE user_id=? AND id=? FOR UPDATE",
            String.class,
            user,
            id);
    if (statuses.isEmpty()) throw new NoSuchElementException();
    if (statuses.getFirst().equals("CANCELLED")) return;
    if (!statuses.getFirst().equals("PLACED") && !statuses.getFirst().equals("AWAITING_PAYMENT"))
      throw new BusinessException("INVALID_ORDER_STATUS", "Chỉ hủy được đơn vừa đặt.");
    cancelAndRestore(id);
  }

  public Map<String, Object> adminOrder(long id) {
    var owners = db.queryForList("SELECT user_id FROM orders WHERE id=?", UUID.class, id);
    if (owners.isEmpty()) throw new NoSuchElementException();
    return order(owners.getFirst(), id);
  }

  public List<Map<String, Object>> adminOrders(int page, int size) {
    return db.queryForList(
        "SELECT id,status,total,currency,created_at,payment_method,payment_status FROM orders ORDER BY id DESC LIMIT ? OFFSET ?",
        size,
        (long) page * size);
  }

  @Transactional
  public void transition(long id, String next) {
    var statuses =
        db.queryForList("SELECT status FROM orders WHERE id=? FOR UPDATE", String.class, id);
    if (statuses.isEmpty()) throw new NoSuchElementException();
    String current = statuses.getFirst();
    if (current.equals(next)) return;
    boolean valid =
        switch (current) {
          // An unpaid online order can only be cancelled; it is confirmed by the IPN, not by hand.
          case "AWAITING_PAYMENT" -> next.equals("CANCELLED");
          case "PLACED" -> next.equals("CONFIRMED") || next.equals("CANCELLED");
          case "CONFIRMED" -> next.equals("SHIPPED") || next.equals("CANCELLED");
          case "SHIPPED" -> next.equals("DELIVERED");
          default -> false;
        };
    if (!valid)
      throw new BusinessException("INVALID_ORDER_STATUS", "Không thể chuyển trạng thái này.");
    if (next.equals("CANCELLED")) cancelAndRestore(id);
    else db.update("UPDATE orders SET status=?,updated_at=now() WHERE id=?", next, id);
  }

  /** Returns stock once; a paid order is flagged for a manual refund (D27). */
  private void cancelAndRestore(long id) {
    restoreStock(id);
    db.update(
        "UPDATE orders SET status='CANCELLED',payment_status=CASE WHEN payment_status='PAID'"
            + " THEN 'REFUND_NEEDED' ELSE payment_status END,updated_at=now() WHERE id=?",
        id);
  }

  private void restoreStock(long id) {
    var rows =
        db.queryForList(
            "SELECT product_id,quantity FROM order_items WHERE order_id=? ORDER BY product_id", id);
    for (var row : rows)
      db.update(
          "UPDATE products SET stock=stock+?,updated_at=now() WHERE id=?",
          row.get("quantity"),
          row.get("product_id"));
  }
}
