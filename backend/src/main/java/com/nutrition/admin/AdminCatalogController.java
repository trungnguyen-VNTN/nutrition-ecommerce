package com.nutrition.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/products")
@Validated
public class AdminCatalogController {
  private final JdbcTemplate db;

  public AdminCatalogController(JdbcTemplate db) {
    this.db = db;
  }

  public record ProductInput(
      @NotBlank @Size(max = 200) String name,
      @Size(max = 2000) String description,
      @NotNull @DecimalMin("0") @jakarta.validation.constraints.DecimalMax("9999999999.99")
          BigDecimal price,
      @Positive long categoryId,
      boolean active) {}

  public record Stock(@Min(0) @Max(1000000) int stock) {}

  @GetMapping
  public List<Map<String, Object>> list(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
    return db.queryForList(
        "SELECT id,name,description,price,currency,stock,category_id,active,nutrition_complete,allergens_verified FROM products ORDER BY id DESC LIMIT ? OFFSET ?",
        size,
        (long) page * size);
  }

  private void category(long id) {
    if (db.queryForObject("SELECT COUNT(*) FROM categories WHERE id=?", Integer.class, id) == 0)
      throw new IllegalArgumentException();
  }

  @PostMapping
  public Map<String, Long> create(@Valid @RequestBody ProductInput product) {
    category(product.categoryId);
    long id =
        db.queryForObject(
            "INSERT INTO products(name,description,price,category_id,stock,active) VALUES (?,?,?,?,0,?) RETURNING id",
            Long.class,
            product.name,
            product.description,
            product.price,
            product.categoryId,
            product.active);
    return Map.of("id", id);
  }

  @PutMapping("/{id}")
  public Map<String, Long> update(
      @PathVariable @Positive long id, @Valid @RequestBody ProductInput product) {
    category(product.categoryId);
    if (db.update(
            "UPDATE products SET name=?,description=?,price=?,category_id=?,active=?,updated_at=now() WHERE id=?",
            product.name,
            product.description,
            product.price,
            product.categoryId,
            product.active,
            id)
        != 1) throw new NoSuchElementException();
    return Map.of("id", id);
  }

  @PatchMapping("/{id}/stock")
  public Map<String, Long> stock(@PathVariable @Positive long id, @Valid @RequestBody Stock stock) {
    if (db.update("UPDATE products SET stock=?,updated_at=now() WHERE id=?", stock.stock, id) != 1)
      throw new NoSuchElementException();
    return Map.of("id", id);
  }

  @DeleteMapping("/{id}")
  public Map<String, Long> hide(@PathVariable @Positive long id) {
    if (db.update("UPDATE products SET active=false,updated_at=now() WHERE id=?", id) != 1)
      throw new NoSuchElementException();
    return Map.of("id", id);
  }
}
