package com.nutrition.catalog;

import java.util.Locale;

/**
 * Nutrition labels derived from database values only (D26), using the EU nutrition claim thresholds
 * of Regulation (EC) No 1924/2006, Annex, per 100 g (solids) or 100 ml (liquids).
 *
 * <p>Each label is one SQL condition, used both to compute the label shown on a product and to
 * filter by it, so the two can never disagree. A label needs complete nutrition and a serving in g
 * or ml; any missing value means no label (invariant 3, fail-closed). Labels are information, not
 * medical advice.
 */
public enum DietLabel {
  /**
   * Protein provides at least 20% of the energy (EU "high protein"). Extra guard, not in the
   * regulation: at least 5 g protein per 100 g/ml, so near-zero-energy drinks such as tea are not
   * labelled.
   */
  HIGH_PROTEIN(
      "n.calories > 0 AND n.protein_g * 4 >= 0.20 * n.calories AND "
          + per100("n.protein_g")
          + " >= 5"),
  /** At most 5 g sugars per 100 g, or 2.5 g per 100 ml. */
  LOW_SUGAR(
      "n.sugar_g IS NOT NULL AND "
          + per100("n.sugar_g")
          + " <= CASE WHEN p.is_liquid THEN 2.5 ELSE 5 END"),
  /** At most 3 g fat per 100 g, or 1.5 g per 100 ml. */
  LOW_FAT(per100("n.fat_g") + " <= CASE WHEN p.is_liquid THEN 1.5 ELSE 3 END"),
  /** At most 0.12 g (120 mg) sodium per 100 g or 100 ml. */
  LOW_SODIUM("n.sodium_mg IS NOT NULL AND " + per100("n.sodium_mg") + " <= 120"),
  /** At least 6 g fibre per 100 g, or at least 3 g fibre per 100 kcal. */
  HIGH_FIBER(
      "n.fiber_g IS NOT NULL AND ("
          + per100("n.fiber_g")
          + " >= 6 OR (n.calories > 0 AND n.fiber_g * 100 >= 3 * n.calories))"),
  /** No animal ingredients, as recorded for the product; unknown (NULL) never qualifies. */
  PLANT_BASED(null);

  /** Complete nutrition with a serving measured in g or ml. */
  static final String COMPLETE =
      "p.nutrition_complete AND n.calories IS NOT NULL AND n.protein_g IS NOT NULL"
          + " AND n.carbs_g IS NOT NULL AND n.fat_g IS NOT NULL"
          + " AND p.serving_size > 0 AND p.serving_unit IN ('g','ml')";

  private final String condition;

  DietLabel(String nutrient) {
    this.condition =
        nutrient == null ? "p.plant_based IS TRUE" : "(" + COMPLETE + " AND " + nutrient + ")";
  }

  /** SQL boolean expression over products {@code p} and product_nutrition {@code n}. */
  String condition() {
    return condition;
  }

  /** Column alias used when the label is selected. */
  String column() {
    return "label_" + name().toLowerCase(Locale.ROOT);
  }

  public static DietLabel parse(String value) {
    try {
      return valueOf(value.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException e) {
      throw new IllegalArgumentException("Unknown label", e);
    }
  }

  private static String per100(String column) {
    return "(" + column + " * 100 / p.serving_size)";
  }
}
