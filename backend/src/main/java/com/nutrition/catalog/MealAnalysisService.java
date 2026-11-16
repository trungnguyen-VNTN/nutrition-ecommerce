package com.nutrition.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nutrition of a meal made of catalog products (D26). Read only. Every number comes from the
 * database and is scaled by grams / serving size; products without complete nutrition are named and
 * the meal is marked incomplete instead of counting them as zero (invariant 3). Meal labels use the
 * same SQL conditions as product labels and only exist for a complete meal.
 */
@Service
@Transactional(readOnly = true)
public class MealAnalysisService {
  public record Item(long productId, BigDecimal grams) {}

  public record Amounts(
      BigDecimal calories,
      BigDecimal proteinG,
      BigDecimal carbsG,
      BigDecimal fatG,
      BigDecimal sugarG,
      BigDecimal fiberG,
      BigDecimal sodiumMg) {}

  public record Line(
      long productId, String name, BigDecimal grams, boolean complete, Amounts amounts) {}

  public record Analysis(
      List<Line> items,
      BigDecimal totalGrams,
      Amounts total,
      boolean complete,
      List<String> incompleteProducts,
      List<String> dietLabels) {}

  private record Row(
      long id,
      String name,
      boolean complete,
      BigDecimal servingSize,
      boolean liquid,
      Boolean plantBased,
      Amounts perServing) {}

  private final NamedParameterJdbcTemplate jdbc;

  public MealAnalysisService(NamedParameterJdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Analysis analyze(List<Item> items) {
    Set<Long> ids = items.stream().map(Item::productId).collect(Collectors.toSet());
    Map<Long, Row> rows =
        jdbc
            .query(
                """
                SELECT p.id,p.name,p.serving_size,p.is_liquid,p.plant_based,
                n.calories,n.protein_g,n.carbs_g,n.fat_g,n.sugar_g,n.fiber_g,n.sodium_mg,
                coalesce(%s, false) AS complete
                FROM products p LEFT JOIN product_nutrition n ON n.product_id=p.id
                WHERE p.active AND p.id IN (:ids)
                """
                    .formatted(DietLabel.COMPLETE),
                Map.of("ids", ids),
                (rs, row) ->
                    new Row(
                        rs.getLong("id"),
                        rs.getString("name"),
                        rs.getBoolean("complete"),
                        rs.getBigDecimal("serving_size"),
                        rs.getBoolean("is_liquid"),
                        (Boolean) rs.getObject("plant_based"),
                        new Amounts(
                            rs.getBigDecimal("calories"),
                            rs.getBigDecimal("protein_g"),
                            rs.getBigDecimal("carbs_g"),
                            rs.getBigDecimal("fat_g"),
                            rs.getBigDecimal("sugar_g"),
                            rs.getBigDecimal("fiber_g"),
                            rs.getBigDecimal("sodium_mg"))))
            .stream()
            .collect(Collectors.toMap(Row::id, Function.identity()));
    if (rows.size() != ids.size()) throw new IllegalArgumentException("Unknown product");

    List<Line> lines = new ArrayList<>();
    Set<String> incomplete = new LinkedHashSet<>();
    BigDecimal grams = BigDecimal.ZERO;
    Amounts total = new Amounts(zero(), zero(), zero(), zero(), zero(), zero(), zero());
    boolean allLiquid = true;
    Boolean plant = Boolean.TRUE;
    for (Item item : items) {
      Row row = rows.get(item.productId());
      grams = grams.add(item.grams());
      allLiquid &= row.liquid();
      plant =
          Boolean.FALSE.equals(plant) || Boolean.FALSE.equals(row.plantBased())
              ? Boolean.FALSE
              : (plant == null || row.plantBased() == null ? null : Boolean.TRUE);
      if (!row.complete()) {
        incomplete.add(row.name());
        lines.add(new Line(row.id(), row.name(), item.grams(), false, null));
        continue;
      }
      BigDecimal factor = item.grams().divide(row.servingSize(), 10, RoundingMode.HALF_UP);
      Amounts scaled = scale(row.perServing(), factor);
      lines.add(new Line(row.id(), row.name(), item.grams(), true, scaled));
      total = add(total, scaled);
    }
    boolean complete = incomplete.isEmpty();
    Amounts rounded = round(total);
    List<String> labels = complete ? labels(rounded, grams, allLiquid, plant) : List.of();
    return new Analysis(lines, grams, rounded, complete, List.copyOf(incomplete), labels);
  }

  /** Meal labels through the same SQL conditions as products, on a single derived row. */
  private List<String> labels(Amounts total, BigDecimal grams, boolean liquid, Boolean plant) {
    String columns =
        Arrays.stream(DietLabel.values())
            .map(label -> "coalesce(" + label.condition() + ", false) AS " + label.column())
            .collect(Collectors.joining(","));
    var parameters =
        new MapSqlParameterSource()
            .addValue("grams", grams)
            .addValue("liquid", liquid)
            .addValue("plant", plant)
            .addValue("kcal", total.calories())
            .addValue("protein", total.proteinG())
            .addValue("carbs", total.carbsG())
            .addValue("fat", total.fatG())
            .addValue("sugar", total.sugarG())
            .addValue("fiber", total.fiberG())
            .addValue("sodium", total.sodiumMg());
    return jdbc.queryForObject(
        "SELECT "
            + columns
            + """
             FROM (SELECT true AS nutrition_complete, CAST(:grams AS numeric) AS serving_size,
               'g'::text AS serving_unit, CAST(:liquid AS boolean) AS is_liquid,
               CAST(:plant AS boolean) AS plant_based) p
             CROSS JOIN (SELECT CAST(:kcal AS numeric) AS calories,
               CAST(:protein AS numeric) AS protein_g, CAST(:carbs AS numeric) AS carbs_g,
               CAST(:fat AS numeric) AS fat_g, CAST(:sugar AS numeric) AS sugar_g,
               CAST(:fiber AS numeric) AS fiber_g, CAST(:sodium AS numeric) AS sodium_mg) n
            """,
        parameters,
        (rs, row) -> {
          List<String> result = new ArrayList<>();
          for (DietLabel label : DietLabel.values())
            if (rs.getBoolean(label.column())) result.add(label.name());
          return List.copyOf(result);
        });
  }

  private static BigDecimal zero() {
    return BigDecimal.ZERO;
  }

  private static BigDecimal times(BigDecimal value, BigDecimal factor) {
    return value == null ? null : value.multiply(factor);
  }

  private static Amounts scale(Amounts a, BigDecimal f) {
    return round(
        new Amounts(
            times(a.calories(), f),
            times(a.proteinG(), f),
            times(a.carbsG(), f),
            times(a.fatG(), f),
            times(a.sugarG(), f),
            times(a.fiberG(), f),
            times(a.sodiumMg(), f)));
  }

  /** A missing optional value (sugar, fibre, sodium) makes the total unknown, never zero. */
  private static BigDecimal plus(BigDecimal total, BigDecimal value) {
    return total == null || value == null ? null : total.add(value);
  }

  private static Amounts add(Amounts t, Amounts a) {
    return new Amounts(
        plus(t.calories(), a.calories()),
        plus(t.proteinG(), a.proteinG()),
        plus(t.carbsG(), a.carbsG()),
        plus(t.fatG(), a.fatG()),
        plus(t.sugarG(), a.sugarG()),
        plus(t.fiberG(), a.fiberG()),
        plus(t.sodiumMg(), a.sodiumMg()));
  }

  private static BigDecimal one(BigDecimal value) {
    return value == null ? null : value.setScale(1, RoundingMode.HALF_UP);
  }

  private static Amounts round(Amounts a) {
    return new Amounts(
        one(a.calories()),
        one(a.proteinG()),
        one(a.carbsG()),
        one(a.fatG()),
        one(a.sugarG()),
        one(a.fiberG()),
        one(a.sodiumMg()));
  }
}
