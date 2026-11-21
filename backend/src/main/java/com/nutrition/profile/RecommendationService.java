package com.nutrition.profile;

import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogRepository;
import com.nutrition.catalog.DietLabel;
import com.nutrition.catalog.ProductSort;
import com.nutrition.profile.NutritionTargets.Targets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.ToDoubleFunction;
import org.springframework.stereotype.Service;

/**
 * Suggests one meal that moves toward the user's daily targets (D32). Deterministic and read-only:
 * products are grouped by their own nutrition numbers (protein-rich, starchy, vegetable or fruit),
 * only complete, in-stock products measured in g or ml are used, the profile's allergens (plus any
 * extra ones) are excluded fail-closed, and every figure comes from the database (invariants 2, 3).
 */
@Service
public class RecommendationService {
  /** Share of the day's targets each meal aims for. */
  public enum Meal {
    BREAKFAST(0.25),
    LUNCH(0.375),
    DINNER(0.375);

    final double share;

    Meal(double share) {
      this.share = share;
    }
  }

  public record Amounts(
      BigDecimal calories, BigDecimal proteinG, BigDecimal carbsG, BigDecimal fatG) {}

  public record Pick(Product product, BigDecimal grams, String role, Amounts amounts) {}

  public record Recommendation(
      boolean eligible,
      NutritionTargets.Ineligible ineligible,
      Meal meal,
      Amounts target,
      List<Pick> items,
      Amounts total,
      Integer caloriesPct,
      Integer proteinPct) {}

  static final double PROTEIN_RICH = 0.25;
  static final double MIN_PROTEIN_PER_100 = 10;
  static final double STARCHY = 0.55;
  static final double LIGHT_KCAL_PER_100 = 70;

  private final ProfileService profiles;
  private final CatalogRepository catalog;

  public RecommendationService(ProfileService profiles, CatalogRepository catalog) {
    this.profiles = profiles;
    this.catalog = catalog;
  }

  public Recommendation recommend(
      UUID user, Meal meal, List<String> extraExcluded, List<DietLabel> labels) {
    var profile = profiles.get(user);
    Targets targets = profiles.targets(profile);
    if (!targets.eligible())
      return new Recommendation(
          false, targets.ineligible(), meal, null, List.of(), null, null, null);

    Set<String> excluded = new LinkedHashSet<>(profile.excludedAllergens());
    if (extraExcluded != null) excluded.addAll(extraExcluded);
    var candidates =
        catalog
            .list(
                0,
                200,
                null,
                null,
                null,
                List.copyOf(excluded),
                "",
                ProductSort.DEFAULT,
                labels == null ? List.of() : labels,
                true)
            .items()
            .stream()
            .filter(RecommendationService::usable)
            .toList();

    double targetKcal = targets.calories() * meal.share;
    double targetProtein = targets.proteinG() * meal.share;
    Amounts target =
        new Amounts(
            round(targetKcal, 0),
            round(targetProtein, 0),
            round(targets.carbsG() * meal.share, 0),
            round(targets.fatG() * meal.share, 0));

    List<Product> proteinRich =
        sorted(
            candidates.stream()
                .filter(
                    p ->
                        energyShare(p, protein(p), 4) >= PROTEIN_RICH
                            && per100(p, protein(p)) >= MIN_PROTEIN_PER_100)
                .toList(),
            p -> -per100(p, protein(p)) / Math.max(1, per100(p, kcal(p))));
    List<Product> light =
        sorted(
            candidates.stream()
                .filter(p -> !proteinRich.contains(p) && per100(p, kcal(p)) <= LIGHT_KCAL_PER_100)
                .toList(),
            p -> -per100(p, fiber(p)));
    List<Product> starchy =
        sorted(
            candidates.stream()
                .filter(
                    p ->
                        !proteinRich.contains(p)
                            && !light.contains(p)
                            && energyShare(p, carbs(p), 4) >= STARCHY)
                .toList(),
            p -> -per100(p, fiber(p)));

    List<Pick> picks = new ArrayList<>();
    double kcalSoFar = 0;
    Product main = pick(proteinRich, meal);
    if (main != null) {
      double grams = clamp(targetProtein * 0.7 / per100(main, protein(main)) * 100, 50, 250);
      kcalSoFar += add(picks, main, grams, "protein");
    }
    Product side = pick(light, meal);
    if (side != null) kcalSoFar += add(picks, side, 150, "rau, trái cây");
    Product base = pick(starchy, meal);
    double remaining = targetKcal - kcalSoFar;
    if (base != null && remaining > 50) {
      double grams = clamp(remaining / per100(base, kcal(base)) * 100, 30, 200);
      add(picks, base, grams, "tinh bột");
    }

    Amounts total =
        new Amounts(
            round(picks.stream().mapToDouble(p -> p.amounts().calories().doubleValue()).sum(), 1),
            round(picks.stream().mapToDouble(p -> p.amounts().proteinG().doubleValue()).sum(), 1),
            round(picks.stream().mapToDouble(p -> p.amounts().carbsG().doubleValue()).sum(), 1),
            round(picks.stream().mapToDouble(p -> p.amounts().fatG().doubleValue()).sum(), 1));
    return new Recommendation(
        true,
        null,
        meal,
        target,
        List.copyOf(picks),
        total,
        percent(total.calories().doubleValue(), targetKcal),
        percent(total.proteinG().doubleValue(), targetProtein));
  }

  /** Complete nutrition measured in g or ml, so amounts scale per 100. */
  static boolean usable(Product p) {
    var n = p.nutrition();
    return p.nutritionComplete()
        && n != null
        && n.calories() != null
        && n.proteinG() != null
        && n.carbsG() != null
        && n.fatG() != null
        && p.servingSize() != null
        && p.servingSize().signum() > 0
        && List.of("g", "ml").contains(p.servingUnit())
        && n.calories().signum() > 0;
  }

  /** Different meals take different products from the same ranked group. */
  private static Product pick(List<Product> ranked, Meal meal) {
    return ranked.isEmpty() ? null : ranked.get(meal.ordinal() % ranked.size());
  }

  private static double add(List<Pick> picks, Product product, double grams, String role) {
    double g = Math.round(grams / 10.0) * 10.0;
    Amounts amounts =
        new Amounts(
            round(per100(product, kcal(product)) * g / 100, 1),
            round(per100(product, protein(product)) * g / 100, 1),
            round(per100(product, carbs(product)) * g / 100, 1),
            round(per100(product, fat(product)) * g / 100, 1));
    picks.add(
        new Pick(product, BigDecimal.valueOf(g).setScale(0, RoundingMode.HALF_UP), role, amounts));
    return amounts.calories().doubleValue();
  }

  private static List<Product> sorted(List<Product> products, ToDoubleFunction<Product> key) {
    return products.stream()
        .sorted(Comparator.comparingDouble(key).thenComparingLong(Product::id))
        .toList();
  }

  private static double energyShare(Product p, BigDecimal grams, int kcalPerGram) {
    double kcal = p.nutrition().calories().doubleValue();
    return kcal <= 0 ? 0 : grams.doubleValue() * kcalPerGram / kcal;
  }

  static double per100(Product p, BigDecimal value) {
    return value == null ? 0 : value.doubleValue() * 100 / p.servingSize().doubleValue();
  }

  private static BigDecimal kcal(Product p) {
    return p.nutrition().calories();
  }

  private static BigDecimal protein(Product p) {
    return p.nutrition().proteinG();
  }

  private static BigDecimal carbs(Product p) {
    return p.nutrition().carbsG();
  }

  private static BigDecimal fat(Product p) {
    return p.nutrition().fatG();
  }

  private static BigDecimal fiber(Product p) {
    return p.nutrition().fiberG();
  }

  private static double clamp(double value, double min, double max) {
    return Math.max(min, Math.min(max, value));
  }

  private static BigDecimal round(double value, int scale) {
    return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP);
  }

  private static Integer percent(double value, double target) {
    return target <= 0 ? null : (int) Math.round(value * 100 / target);
  }
}
