package com.nutrition.catalog;

import com.nutrition.catalog.CatalogModels.Allergen;
import com.nutrition.catalog.CatalogModels.Category;
import com.nutrition.catalog.CatalogModels.Image;
import com.nutrition.catalog.CatalogModels.Nutrition;
import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogModels.ProductPage;
import com.nutrition.images.ImageUrls;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true)
public class CatalogRepository {
  private final NamedParameterJdbcTemplate jdbc;
  private final ImageUrls imageUrls;

  private static final String FROM_FILTER =
      """
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      LEFT JOIN product_nutrition n ON n.product_id=p.id
      WHERE p.active
      AND (:q = '' OR POSITION(unaccent(LOWER(:q)) IN unaccent(LOWER(p.name))) > 0)
      AND (CAST(:category AS bigint) IS NULL OR p.category_id=:category)
      AND (CAST(:calories AS numeric) IS NULL OR n.calories<=:calories)
      AND (CAST(:protein AS numeric) IS NULL OR n.protein_g>=:protein)
      AND (NOT :requiresNutrition OR (p.nutrition_complete AND n.calories IS NOT NULL
          AND n.protein_g IS NOT NULL AND n.carbs_g IS NOT NULL AND n.fat_g IS NOT NULL
          AND p.serving_size IS NOT NULL AND p.serving_unit IS NOT NULL))
      AND (NOT :requiresAllergens OR (p.allergens_verified AND NOT EXISTS (
          SELECT 1 FROM product_allergens pa JOIN allergens a ON a.id=pa.allergen_id
          WHERE pa.product_id=p.id AND a.code IN (:excluded))))
      """;
  private static final String SELECT =
      """
      SELECT p.*, c.id AS cat_id, c.name AS cat_name, c.slug AS cat_slug,
      n.calories,n.protein_g,n.carbs_g,n.fat_g,n.sugar_g,n.fiber_g,n.sodium_mg,n.source
      """;

  public CatalogRepository(NamedParameterJdbcTemplate jdbc, ImageUrls imageUrls) {
    this.jdbc = jdbc;
    this.imageUrls = imageUrls;
  }

  public List<Category> categories() {
    return jdbc.query(
        "SELECT id,name,slug FROM categories ORDER BY id",
        Map.of(),
        (rs, row) -> new Category(rs.getLong("id"), rs.getString("name"), rs.getString("slug")));
  }

  /** Default order (used by the AI search, which ranks nothing itself). */
  public ProductPage list(
      int page,
      int size,
      Long category,
      BigDecimal calories,
      BigDecimal protein,
      List<String> excluded,
      String q) {
    return list(page, size, category, calories, protein, excluded, q, ProductSort.DEFAULT);
  }

  public ProductPage list(
      int page,
      int size,
      Long category,
      BigDecimal calories,
      BigDecimal protein,
      List<String> excluded,
      String q,
      ProductSort sort) {
    List<String> codes = excluded.stream().distinct().toList();
    if (!codes.isEmpty()) {
      Integer known =
          jdbc.queryForObject(
              "SELECT count(*) FROM allergens WHERE code IN (:codes)",
              Map.of("codes", codes),
              Integer.class);
      if (known == null || known != codes.size())
        throw new IllegalArgumentException("Unknown allergen");
    }
    var parameters =
        new MapSqlParameterSource()
            .addValue("q", q.trim())
            .addValue("category", category)
            .addValue("calories", calories)
            .addValue("protein", protein)
            .addValue("requiresNutrition", calories != null || protein != null || !codes.isEmpty())
            .addValue("requiresAllergens", !codes.isEmpty())
            .addValue("excluded", codes.isEmpty() ? List.of("__none__") : codes)
            .addValue("limit", size)
            .addValue("offset", (long) page * size);
    Long total = jdbc.queryForObject("SELECT count(*) " + FROM_FILTER, parameters, Long.class);
    List<Product> items =
        jdbc.query(
            SELECT + FROM_FILTER + " ORDER BY " + sort.orderBy() + " LIMIT :limit OFFSET :offset",
            parameters,
            (rs, row) -> mapProduct(rs));
    return new ProductPage(items, page, size, total == null ? 0 : total);
  }

  public Product get(long id) {
    List<Product> products =
        jdbc.query(
            SELECT
                + """
        FROM products p LEFT JOIN categories c ON c.id=p.category_id
        LEFT JOIN product_nutrition n ON n.product_id=p.id
        WHERE p.active AND p.id=:id
        """,
            Map.of("id", id),
            (rs, row) -> mapProduct(rs));
    if (products.isEmpty()) throw new NoSuchElementException();
    return products.getFirst();
  }

  private Product mapProduct(ResultSet rs) throws SQLException {
    long id = rs.getLong("id");
    boolean complete =
        rs.getBoolean("nutrition_complete")
            && rs.getBigDecimal("calories") != null
            && rs.getBigDecimal("protein_g") != null
            && rs.getBigDecimal("carbs_g") != null
            && rs.getBigDecimal("fat_g") != null
            && rs.getBigDecimal("serving_size") != null
            && rs.getString("serving_unit") != null;
    boolean verified = rs.getBoolean("allergens_verified");
    boolean reviewed = verified && rs.getObject("allergens_reviewed_at") != null;
    Nutrition nutrition =
        complete
            ? new Nutrition(
                rs.getBigDecimal("calories"),
                rs.getBigDecimal("protein_g"),
                rs.getBigDecimal("carbs_g"),
                rs.getBigDecimal("fat_g"),
                rs.getBigDecimal("sugar_g"),
                rs.getBigDecimal("fiber_g"),
                rs.getBigDecimal("sodium_mg"),
                rs.getString("source"))
            : null;
    List<Allergen> allergens =
        verified
            ? jdbc.query(
                """
        SELECT a.code,a.name,pa.kind FROM product_allergens pa JOIN allergens a ON a.id=pa.allergen_id
        WHERE pa.product_id=:id ORDER BY a.id
        """,
                Map.of("id", id),
                (a, row) ->
                    new Allergen(a.getString("code"), a.getString("name"), a.getString("kind")))
            : null;
    List<Image> images =
        jdbc.query(
            "SELECT id,s3_key FROM product_images WHERE product_id=:id ORDER BY sort_order,id",
            Map.of("id", id),
            (i, row) -> new Image(i.getLong("id"), imageUrls.url(i.getString("s3_key"))));
    Category category =
        rs.getObject("cat_id") == null
            ? null
            : new Category(
                rs.getLong("cat_id"), rs.getString("cat_name"), rs.getString("cat_slug"));
    return new Product(
        id,
        rs.getString("name"),
        rs.getString("description"),
        rs.getBigDecimal("price"),
        rs.getString("currency"),
        rs.getInt("stock"),
        category,
        rs.getBigDecimal("serving_size"),
        rs.getString("serving_unit"),
        complete,
        verified,
        reviewed,
        nutrition,
        allergens,
        images);
  }
}
