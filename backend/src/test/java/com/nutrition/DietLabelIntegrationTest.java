package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

/** Diet labels (D26): EU thresholds per 100 g / 100 ml, fail-closed, filter equals label. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@AutoConfigureTestRestTemplate
class DietLabelIntegrationTest {
  @Autowired TestRestTemplate http;
  @Autowired JdbcTemplate db;
  private final List<Long> ids = new ArrayList<>();

  private void product(
      String name,
      boolean liquid,
      Boolean plantBased,
      boolean complete,
      int serving,
      String kcal,
      String protein,
      String fat,
      String sugar,
      String fiber,
      String sodium) {
    long id =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active,serving_size,serving_unit,nutrition_complete,"
                + "is_liquid,plant_based) VALUES (?,1000,1,true,?,?,?,?,?) RETURNING id",
            Long.class,
            name,
            serving,
            liquid ? "ml" : "g",
            complete,
            liquid,
            plantBased);
    ids.add(id);
    db.update(
        "INSERT INTO product_nutrition(product_id,calories,protein_g,carbs_g,fat_g,sugar_g,fiber_g,"
            + "sodium_mg,source) VALUES (?,?::numeric,?::numeric,10,?::numeric,?::numeric,?::numeric,"
            + "?::numeric,'test')",
        id,
        kcal,
        protein,
        fat,
        sugar,
        fiber,
        sodium);
  }

  @BeforeEach
  void setup() {
    // Exactly at every threshold: all labels apply.
    product("label-test-edge", false, true, true, 100, "100", "5", "3", "5", "6", "120");
    // Just over every threshold: none apply.
    product("label-test-over", false, false, true, 100, "100", "4.9", "3.1", "5.1", "2.9", "121");
    // Liquid: 3 g sugar and 2 g fat per 100 ml are too much; 1 kcal tea is not "high protein".
    product("label-test-drink", true, true, true, 100, "1", "0.22", "2", "3", "0", "1");
    // 50 g serving: 3 g sugar per serving is 6 g per 100 g, so not "low sugar".
    product("label-test-half", false, null, true, 50, "50", "1", "0.5", "3", "0", "10");
    // Incomplete nutrition: no nutrient label at all, only the recorded plant-based flag.
    product("label-test-missing", false, true, false, 100, "100", "30", "1", "0", "10", "0");
  }

  @AfterEach
  void cleanup() {
    for (long id : ids) {
      db.update("DELETE FROM product_nutrition WHERE product_id=?", id);
      db.update("DELETE FROM products WHERE id=?", id);
    }
  }

  private Set<String> labels(String name) {
    JsonNode page = http.getForObject("/api/products?size=50&q=" + name, JsonNode.class);
    for (JsonNode p : page.path("items"))
      if (p.path("name").asString().equals(name)) {
        Set<String> result = new HashSet<>();
        for (JsonNode label : p.path("diet_labels")) result.add(label.asString());
        return result;
      }
    throw new AssertionError("missing " + name);
  }

  @Test
  void labelsFollowTheEuThresholdsAndFailClosed() {
    assertThat(labels("label-test-edge"))
        .containsExactlyInAnyOrder(
            "HIGH_PROTEIN", "LOW_SUGAR", "LOW_FAT", "LOW_SODIUM", "HIGH_FIBER", "PLANT_BASED");
    assertThat(labels("label-test-over")).isEmpty();
    assertThat(labels("label-test-drink")).containsExactlyInAnyOrder("LOW_SODIUM", "PLANT_BASED");
    assertThat(labels("label-test-half")).containsExactlyInAnyOrder("LOW_FAT", "LOW_SODIUM");
    assertThat(labels("label-test-missing")).containsExactly("PLANT_BASED");
  }

  @Test
  void filteringByALabelReturnsExactlyTheProductsShowingIt() {
    for (String label :
        List.of(
            "HIGH_PROTEIN", "LOW_SUGAR", "LOW_FAT", "LOW_SODIUM", "HIGH_FIBER", "PLANT_BASED")) {
      JsonNode filtered =
          http.getForObject("/api/products?size=50&q=label-test&label=" + label, JsonNode.class);
      Set<String> names = new HashSet<>();
      for (JsonNode p : filtered.path("items")) {
        names.add(p.path("name").asString());
        assertThat(p.path("diet_labels").toString()).contains(label);
      }
      for (String name :
          List.of(
              "label-test-edge",
              "label-test-over",
              "label-test-drink",
              "label-test-half",
              "label-test-missing"))
        assertThat(names.contains(name))
            .as(label + " " + name)
            .isEqualTo(labels(name).contains(label));
    }
    JsonNode both =
        http.getForObject(
            "/api/products?size=50&q=label-test&label=PLANT_BASED&label=LOW_SODIUM",
            JsonNode.class);
    assertThat(both.path("total").asInt()).isEqualTo(2);
    assertThat(
            http.getForEntity("/api/products?label=KETO", JsonNode.class).getStatusCode().value())
        .isEqualTo(400);
  }
}
