package com.nutrition.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Operations overview for admins (phase 7). Aggregates only: no names, phones or addresses of
 * customers (invariant 4). Days follow Vietnam time so "today" matches what the admin sees.
 */
@RestController
public class AdminStatsController {
  static final int LOW_STOCK = 5;
  private static final String ZONE = "Asia/Ho_Chi_Minh";

  private final JdbcTemplate db;

  public AdminStatsController(JdbcTemplate db) {
    this.db = db;
  }

  public record OrderStats(
      long total, Map<String, Long> byStatus, BigDecimal revenue, String currency) {}

  public record Day(LocalDate date, long orders) {}

  public record CatalogStats(
      long activeProducts,
      long outOfStock,
      long lowStock,
      long missingNutrition,
      long allergensUnverified,
      long allergensSample) {}

  public record LowStockItem(long id, String name, int stock) {}

  public record Stats(
      OrderStats orders,
      List<Day> recentDays,
      CatalogStats catalog,
      List<LowStockItem> lowStockItems,
      int lowStockThreshold) {}

  @GetMapping("/api/admin/stats")
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Stats stats() {
    Map<String, Long> byStatus = new LinkedHashMap<>();
    for (String status : List.of("PLACED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"))
      byStatus.put(status, 0L);
    db.query(
        "SELECT status, count(*) AS n FROM orders GROUP BY status",
        rs -> {
          byStatus.put(rs.getString("status"), rs.getLong("n"));
        });
    long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
    // Revenue of orders that were not cancelled (no payment in the MVP, D6).
    BigDecimal revenue =
        db.queryForObject(
            "SELECT coalesce(sum(total),0) FROM orders WHERE status <> 'CANCELLED'",
            BigDecimal.class);

    List<Day> days =
        db.query(
            """
            SELECT d::date AS day, count(o.id) AS n
            FROM generate_series((now() AT TIME ZONE ?)::date - 6, (now() AT TIME ZONE ?)::date,
                                 interval '1 day') AS d
            LEFT JOIN orders o ON (o.created_at AT TIME ZONE ?)::date = d::date
            GROUP BY d ORDER BY d
            """,
            (rs, row) -> new Day(rs.getObject("day", LocalDate.class), rs.getLong("n")),
            ZONE,
            ZONE,
            ZONE);

    CatalogStats catalog =
        db.queryForObject(
            """
            SELECT count(*) AS active,
              count(*) FILTER (WHERE stock = 0) AS out_of_stock,
              count(*) FILTER (WHERE stock BETWEEN 1 AND ?) AS low_stock,
              count(*) FILTER (WHERE NOT nutrition_complete) AS missing_nutrition,
              count(*) FILTER (WHERE NOT allergens_verified) AS unverified,
              count(*) FILTER (WHERE allergens_verified AND allergens_reviewed_at IS NULL) AS sample
            FROM products WHERE active
            """,
            (rs, row) ->
                new CatalogStats(
                    rs.getLong("active"),
                    rs.getLong("out_of_stock"),
                    rs.getLong("low_stock"),
                    rs.getLong("missing_nutrition"),
                    rs.getLong("unverified"),
                    rs.getLong("sample")),
            LOW_STOCK);

    List<LowStockItem> low =
        db.query(
            "SELECT id,name,stock FROM products WHERE active AND stock <= ? ORDER BY stock, id LIMIT 5",
            (rs, row) ->
                new LowStockItem(rs.getLong("id"), rs.getString("name"), rs.getInt("stock")),
            LOW_STOCK);

    return new Stats(
        new OrderStats(total, byStatus, revenue, "VND"), days, catalog, low, LOW_STOCK);
  }
}
