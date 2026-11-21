package com.nutrition.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.nutrition.catalog.CatalogModels.Nutrition;
import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogModels.ProductPage;
import com.nutrition.catalog.CatalogRepository;
import com.nutrition.catalog.ProductSort;
import com.nutrition.profile.NutritionTargets.Activity;
import com.nutrition.profile.NutritionTargets.Goal;
import com.nutrition.profile.NutritionTargets.Sex;
import com.nutrition.profile.RecommendationService.Meal;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RecommendationServiceTest {
  private final ProfileService profiles = mock(ProfileService.class);
  private final CatalogRepository catalog = mock(CatalogRepository.class);
  private final RecommendationService service = new RecommendationService(profiles, catalog);
  private final UUID user = UUID.randomUUID();

  private static Product product(
      long id,
      String name,
      String kcal,
      String protein,
      String carbs,
      String fat,
      boolean complete) {
    return new Product(
        id,
        name,
        null,
        BigDecimal.valueOf(10000),
        "VND",
        5,
        null,
        BigDecimal.valueOf(100),
        "g",
        complete,
        true,
        false,
        new Nutrition(
            new BigDecimal(kcal),
            new BigDecimal(protein),
            new BigDecimal(carbs),
            new BigDecimal(fat),
            null,
            BigDecimal.ONE,
            null,
            "USDA"),
        List.of(),
        List.of(),
        List.of());
  }

  // Per 100 g: chicken is protein-rich, broccoli is light, brown rice is starchy.
  private static final Product CHICKEN = product(1, "Ức gà", "165", "31", "0", "3.6", true);
  private static final Product BROCCOLI =
      product(2, "Bông cải xanh", "34", "2.8", "6.6", "0.4", true);
  private static final Product RICE = product(3, "Gạo lứt", "370", "7.9", "77", "2.9", true);
  private static final Product UNKNOWN = product(4, "Bánh lạ", "400", "40", "10", "20", false);

  private void profile(boolean eligible, List<String> allergens) {
    var profile =
        new ProfileService.Profile(
            1995,
            Sex.MALE,
            BigDecimal.valueOf(180),
            BigDecimal.valueOf(80),
            Activity.MODERATE,
            Goal.MAINTAIN,
            allergens,
            false,
            !eligible,
            null);
    when(profiles.get(user)).thenReturn(profile);
    when(profiles.targets(profile))
        .thenReturn(
            eligible
                ? new NutritionTargets.Targets(
                    true, null, 31, BigDecimal.valueOf(24.7), 1780, 2760, 2760, 80, 403, 92)
                : new NutritionTargets.Targets(
                    false,
                    NutritionTargets.Ineligible.MEDICAL,
                    31,
                    BigDecimal.valueOf(24.7),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null));
  }

  private void catalogReturns(Product... products) {
    when(catalog.list(
            anyInt(),
            anyInt(),
            isNull(),
            isNull(),
            isNull(),
            anyList(),
            anyString(),
            any(ProductSort.class),
            anyList(),
            anyBoolean()))
        .thenReturn(new ProductPage(List.of(products), 0, 200, products.length));
  }

  @Test
  void aLunchCombinesProteinVegetableAndStarchFromDatabaseNumbers() {
    profile(true, List.of("milk"));
    catalogReturns(CHICKEN, BROCCOLI, RICE, UNKNOWN);
    var rec = service.recommend(user, Meal.LUNCH, List.of("peanut"), List.of());
    assertThat(rec.eligible()).isTrue();
    // Lunch is 37.5% of 2760 kcal and 80 g protein.
    assertThat(rec.target().calories()).isEqualByComparingTo("1035");
    assertThat(rec.target().proteinG()).isEqualByComparingTo("30");
    assertThat(rec.items())
        .extracting(p -> p.product().name())
        .containsExactly("Ức gà", "Bông cải xanh", "Gạo lứt");
    // Chicken: 70% of 30 g protein = 21 g -> 68 g -> rounded 70 g; numbers scale from per 100 g.
    var chicken = rec.items().getFirst();
    assertThat(chicken.grams()).isEqualByComparingTo("70");
    assertThat(chicken.amounts().proteinG()).isEqualByComparingTo("21.7");
    assertThat(rec.total().calories().doubleValue()).isBetween(900.0, 1150.0);
    assertThat(rec.caloriesPct()).isBetween(85, 115);
    // The product without complete data is never suggested (fail-closed).
    assertThat(rec.items()).noneMatch(p -> p.product().id() == 4);
    // Allergens from the profile and the request both reach the read-only catalog, in stock only.
    verify(catalog)
        .list(
            eq(0),
            eq(200),
            isNull(),
            isNull(),
            isNull(),
            eq(List.of("milk", "peanut")),
            eq(""),
            eq(ProductSort.DEFAULT),
            eq(List.of()),
            eq(true));
  }

  @Test
  void differentMealsRotateWithinEachGroup() {
    profile(true, List.of());
    var salmon = product(5, "Cá hồi", "208", "20", "0", "13", true);
    catalogReturns(CHICKEN, salmon, BROCCOLI, RICE);
    var lunch = service.recommend(user, Meal.LUNCH, null, null);
    var dinner = service.recommend(user, Meal.DINNER, null, null);
    assertThat(lunch.items().getFirst().product().name())
        .isNotEqualTo(dinner.items().getFirst().product().name());
  }

  @Test
  void ineligibleProfilesGetNoSuggestionsAndNoCatalogQuery() {
    profile(false, List.of());
    var rec = service.recommend(user, Meal.DINNER, null, null);
    assertThat(rec.eligible()).isFalse();
    assertThat(rec.ineligible()).isEqualTo(NutritionTargets.Ineligible.MEDICAL);
    assertThat(rec.items()).isEmpty();
    verifyNoInteractions(catalog);
  }

  @Test
  void noProfileMeansNotFoundAndAnEmptyCatalogMeansNoItems() {
    var stranger = UUID.randomUUID();
    when(profiles.get(stranger)).thenThrow(new NoSuchElementException());
    assertThatThrownBy(() -> service.recommend(stranger, Meal.LUNCH, null, null))
        .isInstanceOf(NoSuchElementException.class);

    profile(true, List.of());
    catalogReturns(UNKNOWN);
    var rec = service.recommend(user, Meal.BREAKFAST, null, null);
    assertThat(rec.items()).isEmpty();
    assertThat(rec.total().calories()).isEqualByComparingTo("0");
  }
}
