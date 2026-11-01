package com.nutrition.ai;

import java.math.BigDecimal;
import java.util.List;

public interface LlmClient {
  record Search(
      String q,
      BigDecimal maxCalories,
      BigDecimal minProtein,
      List<String> excludeAllergen,
      boolean medicalAdvice) {}

  Search search(String message);
}
