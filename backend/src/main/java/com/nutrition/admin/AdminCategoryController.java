package com.nutrition.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {
  private final JdbcTemplate db;

  public AdminCategoryController(JdbcTemplate db) {
    this.db = db;
  }

  public record Category(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Size(max = 100) @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") String slug) {}

  @PostMapping
  public Map<String, Long> create(@Valid @RequestBody Category category) {
    return Map.of(
        "id",
        db.queryForObject(
            "INSERT INTO categories(name,slug) VALUES (?,?) RETURNING id",
            Long.class,
            category.name.trim(),
            category.slug));
  }

  @PutMapping("/{id}")
  public Map<String, Long> update(
      @Positive @PathVariable long id, @Valid @RequestBody Category category) {
    if (db.update(
            "UPDATE categories SET name=?,slug=? WHERE id=?",
            category.name.trim(),
            category.slug,
            id)
        != 1) throw new NoSuchElementException();
    return Map.of("id", id);
  }

  @DeleteMapping("/{id}")
  public Map<String, Long> delete(@Positive @PathVariable long id) {
    // The foreign key prevents deleting a category still referenced by any product.
    if (db.update("DELETE FROM categories WHERE id=?", id) != 1) throw new NoSuchElementException();
    return Map.of("id", id);
  }
}
