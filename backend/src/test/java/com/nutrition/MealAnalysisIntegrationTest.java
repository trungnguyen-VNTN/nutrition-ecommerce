package com.nutrition;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Meal calculator (D26): DB numbers scaled by grams, incomplete data never counted as zero. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class MealAnalysisIntegrationTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private final List<Long> ids = new ArrayList<>();
  private long a;
  private long b;
  private long c;

  private long product(String name, int serving, boolean complete, Boolean plant) {
    long id =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active,serving_size,serving_unit,"
                + "nutrition_complete,plant_based) VALUES (?,1000,1,true,?,'g',?,?) RETURNING id",
            Long.class,
            name,
            serving,
            complete,
            plant);
    ids.add(id);
    return id;
  }

  @BeforeEach
  void setup() {
    a = product("meal-test-a", 100, true, true);
    db.update("INSERT INTO product_nutrition VALUES (?,200,20,10,5,2,1,100,'test')", a);
    b = product("meal-test-b", 50, true, false);
    db.update("INSERT INTO product_nutrition VALUES (?,100,5,10,2,NULL,3,20,'test')", b);
    c = product("meal-test-c", 100, false, true);
  }

  @AfterEach
  void cleanup() {
    for (long id : ids) {
      db.update("DELETE FROM product_nutrition WHERE product_id=?", id);
      db.update("DELETE FROM products WHERE id=?", id);
    }
  }

  private ResultActions analyze(String items) throws Exception {
    return http.perform(
        post("/api/nutrition/analyze")
            .contentType("application/json")
            .content("{\"items\":[" + items + "]}"));
  }

  private String item(long id, int grams) {
    return "{\"product_id\":" + id + ",\"grams\":" + grams + "}";
  }

  @Test
  void scalesDatabaseValuesByGramsAndLabelsTheMeal() throws Exception {
    analyze(item(a, 150))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.complete").value(true))
        .andExpect(jsonPath("$.total_grams").value(150))
        .andExpect(jsonPath("$.total.calories").value(300.0))
        .andExpect(jsonPath("$.total.protein_g").value(30.0))
        .andExpect(jsonPath("$.total.sodium_mg").value(150.0))
        .andExpect(jsonPath("$.items[0].amounts.fat_g").value(7.5))
        .andExpect(jsonPath("$.diet_labels.length()").value(4))
        .andExpect(
            jsonPath("$.diet_labels")
                .value(
                    org.hamcrest.Matchers.contains(
                        "HIGH_PROTEIN", "LOW_SUGAR", "LOW_SODIUM", "PLANT_BASED")));
  }

  @Test
  void aMissingOptionalValueMakesTheTotalUnknownNotZero() throws Exception {
    // b has a 50 g serving, so 100 g doubles its values; its sugar is unknown.
    analyze(item(a, 100) + "," + item(b, 100))
        .andExpect(jsonPath("$.complete").value(true))
        .andExpect(jsonPath("$.total.calories").value(400.0))
        .andExpect(jsonPath("$.total.fiber_g").value(7.0))
        .andExpect(jsonPath("$.total.sugar_g").isEmpty())
        .andExpect(
            jsonPath("$.diet_labels")
                .value(org.hamcrest.Matchers.contains("HIGH_PROTEIN", "LOW_SODIUM")));
  }

  @Test
  void productsWithoutCompleteNutritionAreNamedAndBlockMealLabels() throws Exception {
    analyze(item(a, 100) + "," + item(c, 100))
        .andExpect(jsonPath("$.complete").value(false))
        .andExpect(jsonPath("$.incomplete_products[0]").value("meal-test-c"))
        .andExpect(jsonPath("$.items[1].complete").value(false))
        .andExpect(jsonPath("$.items[1].amounts").isEmpty())
        .andExpect(jsonPath("$.diet_labels.length()").value(0));
  }

  @Test
  void rejectsUnknownProductsAndOutOfRangeInput() throws Exception {
    analyze(item(999999999L, 100)).andExpect(status().isBadRequest());
    analyze(item(a, 0)).andExpect(status().isBadRequest());
    analyze(item(a, 5001)).andExpect(status().isBadRequest());
    analyze("").andExpect(status().isBadRequest());
    String many = String.join(",", java.util.Collections.nCopies(31, item(a, 10)));
    analyze(many).andExpect(status().isBadRequest());
  }
}
