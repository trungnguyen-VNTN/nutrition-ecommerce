package com.nutrition.catalog;

import com.nutrition.catalog.CatalogModels.Category;
import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogModels.ProductPage;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Validated
public class CatalogController {
  private final CatalogRepository catalog;

  public CatalogController(CatalogRepository catalog) {
    this.catalog = catalog;
  }

  @GetMapping("/categories")
  public List<Category> categories() {
    return catalog.categories();
  }

  @GetMapping("/products")
  public ProductPage products(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "8") @Min(1) @Max(50) int size,
      @RequestParam(required = false) @Positive Long categoryId,
      @RequestParam(required = false) @DecimalMin("0") BigDecimal maxCalories,
      @RequestParam(required = false) @DecimalMin("0") BigDecimal minProtein,
      @RequestParam(defaultValue = "") List<String> excludeAllergen) {
    return catalog.list(page, size, categoryId, maxCalories, minProtein, excludeAllergen);
  }

  @GetMapping("/products/{id}")
  public Product product(@PathVariable @Positive long id) {
    return catalog.get(id);
  }
}
