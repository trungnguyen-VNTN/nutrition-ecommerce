package com.nutrition.catalog;

import java.util.Locale;

/**
 * Whitelisted product orderings. The ORDER BY text comes only from this enum, never from the
 * request. Nutrition sorts rank only complete nutrition data; products without it go last instead
 * of being treated as zero (invariant 3).
 */
public enum ProductSort {
  DEFAULT("p.id"),
  PRICE_ASC("p.price ASC, p.id"),
  PRICE_DESC("p.price DESC, p.id"),
  PROTEIN_DESC(nutrition("n.protein_g") + " DESC NULLS LAST, p.id"),
  CALORIES_ASC(nutrition("n.calories") + " ASC NULLS LAST, p.id");

  private final String orderBy;

  ProductSort(String orderBy) {
    this.orderBy = orderBy;
  }

  String orderBy() {
    return orderBy;
  }

  public static ProductSort parse(String value) {
    try {
      return valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown sort", e);
    }
  }

  private static String nutrition(String column) {
    return "CASE WHEN p.nutrition_complete AND n.calories IS NOT NULL AND n.protein_g IS NOT NULL"
        + " AND n.carbs_g IS NOT NULL AND n.fat_g IS NOT NULL AND p.serving_size IS NOT NULL"
        + " AND p.serving_unit IS NOT NULL THEN "
        + column
        + " END";
  }
}
