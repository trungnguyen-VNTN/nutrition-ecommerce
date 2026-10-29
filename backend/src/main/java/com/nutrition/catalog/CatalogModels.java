package com.nutrition.catalog;

import java.math.BigDecimal;
import java.util.List;

public final class CatalogModels {
  private CatalogModels() {}

  public record Category(long id, String name, String slug) {}

  public record Allergen(String code, String name, String kind) {}

  public record Nutrition(
      BigDecimal calories,
      BigDecimal proteinG,
      BigDecimal carbsG,
      BigDecimal fatG,
      BigDecimal sugarG,
      BigDecimal fiberG,
      BigDecimal sodiumMg,
      String source) {}

  public record Product(
      long id,
      String name,
      String description,
      BigDecimal price,
      String currency,
      int stock,
      Category category,
      BigDecimal servingSize,
      String servingUnit,
      boolean nutritionComplete,
      boolean allergensVerified,
      Nutrition nutrition,
      List<Allergen> allergens) {}

  public record ProductPage(List<Product> items, int page, int size, long total) {}
}
