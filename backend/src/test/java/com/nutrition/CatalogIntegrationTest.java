package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("local")
@org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate
class CatalogIntegrationTest {
  @Autowired TestRestTemplate http;

  @Test
  void filtersFailClosedForNutritionAndAllergens() {
    JsonNode all = http.getForObject("/api/products?size=50", JsonNode.class);
    assertThat(all.path("total").asInt()).isEqualTo(20);
    JsonNode nutrition =
        http.getForObject("/api/products?size=50&maxCalories=250&minProtein=10", JsonNode.class);
    assertThat(nutrition.path("items").size()).isPositive();
    for (JsonNode p : nutrition.path("items")) {
      assertThat(p.path("nutrition_complete").asBoolean()).isTrue();
      assertThat(p.path("nutrition").path("calories").asDouble()).isLessThanOrEqualTo(250);
      assertThat(p.path("nutrition").path("protein_g").asDouble()).isGreaterThanOrEqualTo(10);
    }
    JsonNode safe =
        http.getForObject(
            "/api/products?size=50&excludeAllergen=peanut&excludeAllergen=milk", JsonNode.class);
    assertThat(safe.path("items").size()).isPositive();
    for (JsonNode p : safe.path("items")) {
      assertThat(p.path("nutrition_complete").asBoolean()).isTrue();
      assertThat(p.path("allergens_verified").asBoolean()).isTrue();
      for (JsonNode allergen : p.path("allergens"))
        assertThat(allergen.path("code").asText()).isNotIn("peanut", "milk");
    }
    assertThat(
            http.getForEntity("/api/products?maxCalories=-1", JsonNode.class)
                .getStatusCode()
                .value())
        .isEqualTo(400);
  }

  @Test
  void paginationIsStableBoundedAndConsistentWithDetail() {
    JsonNode first = http.getForObject("/api/products?page=0&size=8", JsonNode.class);
    JsonNode second = http.getForObject("/api/products?page=1&size=8", JsonNode.class);
    assertThat(first.path("items").size()).isEqualTo(8);
    assertThat(second.path("items").size()).isEqualTo(8);
    assertThat(first.path("total").asInt()).isEqualTo(second.path("total").asInt()).isEqualTo(20);
    Set<Long> ids = new HashSet<>();
    for (JsonNode p : first.path("items")) ids.add(p.path("id").asLong());
    for (JsonNode p : second.path("items")) assertThat(ids.add(p.path("id").asLong())).isTrue();
    assertThat(
            http.getForObject("/api/products?page=9&size=8", JsonNode.class)
                .path("items")
                .isEmpty())
        .isTrue();
    JsonNode detail = http.getForObject("/api/products/5", JsonNode.class);
    assertThat(detail.path("nutrition_complete").asBoolean()).isFalse();
    assertThat(detail.path("nutrition").isNull()).isTrue();
    assertThat(http.getForEntity("/api/products?size=51", JsonNode.class).getStatusCode().value())
        .isEqualTo(400);
    assertThat(http.getForEntity("/api/products/9999", JsonNode.class).getStatusCode().value())
        .isEqualTo(404);
  }

  @Test
  void searchIgnoresVietnameseAccentsAndCase() {
    JsonNode plain = http.getForObject("/api/products?q=yen mach", JsonNode.class);
    Set<String> names = new HashSet<>();
    for (JsonNode p : plain.path("items")) names.add(p.path("name").asText());
    assertThat(names).containsExactlyInAnyOrder("Yến mạch nguyên hạt", "Sữa yến mạch");
    // unaccent maps đ to d, so "dau" matches every "Đậu ..." product.
    JsonNode beans = http.getForObject("/api/products?size=50&q=DAU", JsonNode.class);
    assertThat(beans.path("total").asInt()).isEqualTo(6);
    assertThat(http.getForObject("/api/products?q=Yến mạch", JsonNode.class).path("total").asInt())
        .isEqualTo(2);
  }

  @Test
  void sortingIsWhitelistedAndKeepsIncompleteNutritionLast() {
    JsonNode cheap = http.getForObject("/api/products?size=50&sort=price_asc", JsonNode.class);
    double previous = -1;
    for (JsonNode p : cheap.path("items")) {
      assertThat(p.path("price").asDouble()).isGreaterThanOrEqualTo(previous);
      previous = p.path("price").asDouble();
    }
    JsonNode protein = http.getForObject("/api/products?size=50&sort=protein_desc", JsonNode.class);
    assertThat(protein.path("total").asInt()).isEqualTo(20);
    boolean seenIncomplete = false;
    double highest = Double.MAX_VALUE;
    for (JsonNode p : protein.path("items")) {
      if (!p.path("nutrition_complete").asBoolean()) {
        seenIncomplete = true;
        continue;
      }
      assertThat(seenIncomplete).as("complete nutrition ranks before missing data").isFalse();
      assertThat(p.path("nutrition").path("protein_g").asDouble()).isLessThanOrEqualTo(highest);
      highest = p.path("nutrition").path("protein_g").asDouble();
    }
    assertThat(seenIncomplete).isTrue();
    assertThat(
            http.getForEntity("/api/products?sort=p.id;drop", JsonNode.class)
                .getStatusCode()
                .value())
        .isEqualTo(400);
  }

  @Test
  void seedDataIsNeverReportedAsReviewedByAPerson() {
    JsonNode all = http.getForObject("/api/products?size=50", JsonNode.class);
    for (JsonNode p : all.path("items"))
      assertThat(p.path("allergens_reviewed").asBoolean()).isFalse();
  }
}
