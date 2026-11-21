package com.nutrition.ai;

import java.math.BigDecimal;
import java.util.List;

public interface LlmClient {
  /**
   * Intents the model may choose (the original design's searchProducts / getNutrition / compare).
   */
  List<String> INTENTS = List.of("search", "facts", "compare", "plan");

  /** Meals the "plan" intent may name (RecommendationService.Meal). */
  List<String> MEALS = List.of("BREAKFAST", "LUNCH", "DINNER");

  /**
   * What the model extracted from one question. Every field is validated before use; the model
   * never writes the answer (ChatService builds it from the database).
   *
   * @param category category slug from the categories table, or null
   * @param labels DietLabel names, e.g. LOW_SUGAR
   * @param inStock true when the user asked only for products in stock
   * @param intent "search" (default), "facts" (nutrition facts of named foods), "compare" or "plan"
   *     (a meal toward the caller's own targets, D32)
   * @param items food names for "facts" / "compare" (1 to 3)
   * @param meal BREAKFAST, LUNCH or DINNER for "plan", or null
   */
  record Search(
      String q,
      BigDecimal maxCalories,
      BigDecimal minProtein,
      List<String> excludeAllergen,
      boolean medicalAdvice,
      String category,
      List<String> labels,
      Boolean inStock,
      String intent,
      List<String> items,
      String meal) {

    /** A plain catalog search (the original five fields). */
    public Search(
        String q,
        BigDecimal maxCalories,
        BigDecimal minProtein,
        List<String> excludeAllergen,
        boolean medicalAdvice) {
      this(
          q, maxCalories, minProtein, excludeAllergen, medicalAdvice, null, null, null, null, null);
    }

    /** Everything except the meal (before D32). */
    public Search(
        String q,
        BigDecimal maxCalories,
        BigDecimal minProtein,
        List<String> excludeAllergen,
        boolean medicalAdvice,
        String category,
        List<String> labels,
        Boolean inStock,
        String intent,
        List<String> items) {
      this(
          q,
          maxCalories,
          minProtein,
          excludeAllergen,
          medicalAdvice,
          category,
          labels,
          inStock,
          intent,
          items,
          null);
    }

    public String intentOrSearch() {
      return intent == null || intent.isBlank() ? "search" : intent;
    }
  }

  Search search(String message);
}
