package com.nutrition.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products/{id}")
@Validated
public class AdminNutritionController {
  private final JdbcTemplate db;

  public AdminNutritionController(JdbcTemplate db) {
    this.db = db;
  }

  public record Nutrition(
      @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2)
          BigDecimal servingSize,
      @Pattern(regexp = "g|ml|unit") String servingUnit,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal calories,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal proteinG,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal carbsG,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal fatG,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal sugarG,
      @DecimalMin("0") @Digits(integer = 6, fraction = 2) BigDecimal fiberG,
      @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal sodiumMg,
      @NotBlank @Size(max = 500) String source) {}

  public record Allergen(
      @NotBlank @Size(max = 40) String code,
      @NotBlank @Pattern(regexp = "contains|may_contain") String kind) {}

  public record Allergens(
      boolean verified, @NotNull @Size(max = 6) List<@NotNull @Valid Allergen> items) {}

  private void exists(long id) {
    if (db.queryForList("SELECT id FROM products WHERE id=? FOR UPDATE", Long.class, id).isEmpty())
      throw new NoSuchElementException();
  }

  @GetMapping("/data")
  @Transactional(
      readOnly = true,
      isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
  public Map<String, Object> data(@PathVariable @Positive long id) {
    var products =
        db.queryForList(
            "SELECT name,serving_size,serving_unit,nutrition_complete,allergens_verified FROM products WHERE id=?",
            id);
    if (products.isEmpty()) throw new NoSuchElementException();
    var result = new HashMap<>(products.getFirst());
    var nutrition =
        db.queryForList(
            "SELECT calories,protein_g,carbs_g,fat_g,sugar_g,fiber_g,sodium_mg,source FROM product_nutrition WHERE product_id=?",
            id);
    result.put("nutrition", nutrition.isEmpty() ? null : nutrition.getFirst());
    result.put(
        "allergens",
        db.queryForList(
            "SELECT a.code,a.name,pa.kind FROM product_allergens pa JOIN allergens a ON a.id=pa.allergen_id WHERE pa.product_id=? ORDER BY a.id",
            id));
    result.put(
        "available_allergens", db.queryForList("SELECT code,name FROM allergens ORDER BY id"));
    return result;
  }

  @PutMapping("/nutrition")
  @Transactional
  public Map<String, Boolean> nutrition(
      @PathVariable @Positive long id, @Valid @RequestBody Nutrition n) {
    exists(id);
    boolean complete =
        n.servingSize != null
            && n.servingUnit != null
            && n.calories != null
            && n.proteinG != null
            && n.carbsG != null
            && n.fatG != null;
    db.update(
        """
        INSERT INTO product_nutrition(product_id,calories,protein_g,carbs_g,fat_g,sugar_g,fiber_g,sodium_mg,source)
        VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(product_id) DO UPDATE SET
        calories=EXCLUDED.calories,protein_g=EXCLUDED.protein_g,carbs_g=EXCLUDED.carbs_g,fat_g=EXCLUDED.fat_g,
        sugar_g=EXCLUDED.sugar_g,fiber_g=EXCLUDED.fiber_g,sodium_mg=EXCLUDED.sodium_mg,source=EXCLUDED.source
        """,
        id,
        n.calories,
        n.proteinG,
        n.carbsG,
        n.fatG,
        n.sugarG,
        n.fiberG,
        n.sodiumMg,
        n.source);
    db.update(
        "UPDATE products SET serving_size=?,serving_unit=?,nutrition_complete=?,updated_at=now() WHERE id=?",
        n.servingSize,
        n.servingUnit,
        complete,
        id);
    return Map.of("nutrition_complete", complete);
  }

  @PutMapping("/allergens")
  @Transactional
  public Map<String, Boolean> allergens(
      @PathVariable @Positive long id, @Valid @RequestBody Allergens input) {
    exists(id);
    if (input.items.stream().map(Allergen::code).distinct().count() != input.items.size())
      throw new IllegalArgumentException();
    db.update("DELETE FROM product_allergens WHERE product_id=?", id);
    for (var item : input.items) {
      int changed =
          db.update(
              "INSERT INTO product_allergens(product_id,allergen_id,kind) SELECT ?,id,? FROM allergens WHERE code=?",
              id,
              item.kind,
              item.code);
      if (changed != 1) throw new IllegalArgumentException();
    }
    db.update(
        "UPDATE products SET allergens_verified=?,updated_at=now() WHERE id=?", input.verified, id);
    return Map.of("allergens_verified", input.verified);
  }
}
