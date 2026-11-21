package com.nutrition.profile;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Daily energy and macro estimates for healthy adults (D32). Pure arithmetic, no I/O, so every rule
 * is unit-tested:
 *
 * <ul>
 *   <li>Resting energy: Mifflin-St Jeor (1990), 10 W + 6.25 H - 5 A + 5 (men) or - 161 (women).
 *   <li>Daily energy: resting energy times an activity factor (1.2 / 1.375 / 1.55 / 1.725).
 *   <li>Goal: lose -15%, maintain, gain muscle +10%; never below resting energy (safety floor).
 *   <li>Protein: 1.2 / 1.0 / 1.6 g per kg for lose / maintain / gain; fat 30% of energy; carbs the
 *       rest, which lands inside the usual 45-65% range for these inputs.
 * </ul>
 *
 * People the estimate is not meant for (under 18 or over 65, pregnant or breastfeeding, a medical
 * condition that needs a supervised diet, BMI under 17 or over 35) get no personal targets: the
 * reason is returned instead so the UI can point them to a professional (invariant 4).
 */
public final class NutritionTargets {
  private NutritionTargets() {}

  public enum Sex {
    MALE,
    FEMALE
  }

  public enum Activity {
    SEDENTARY(1.2),
    LIGHT(1.375),
    MODERATE(1.55),
    ACTIVE(1.725);

    final double factor;

    Activity(double factor) {
      this.factor = factor;
    }
  }

  public enum Goal {
    LOSE(0.85, 1.2),
    MAINTAIN(1.0, 1.0),
    GAIN_MUSCLE(1.10, 1.6);

    final double energy;
    final double proteinPerKg;

    Goal(double energy, double proteinPerKg) {
      this.energy = energy;
      this.proteinPerKg = proteinPerKg;
    }
  }

  /** Why no personal targets are given. */
  public enum Ineligible {
    AGE,
    PREGNANCY,
    MEDICAL,
    BMI
  }

  public record Input(
      int age,
      Sex sex,
      BigDecimal heightCm,
      BigDecimal weightKg,
      Activity activity,
      Goal goal,
      boolean pregnantOrBreastfeeding,
      boolean medicalCondition) {}

  /** Rounded figures for display; null targets when {@code ineligible} is set. */
  public record Targets(
      boolean eligible,
      Ineligible ineligible,
      int age,
      BigDecimal bmi,
      Integer restingCalories,
      Integer dailyCalories,
      Integer calories,
      Integer proteinG,
      Integer carbsG,
      Integer fatG) {}

  public static final BigDecimal MIN_BMI = BigDecimal.valueOf(17);
  public static final BigDecimal MAX_BMI = BigDecimal.valueOf(35);

  public static Targets compute(Input in) {
    double weight = in.weightKg().doubleValue();
    double height = in.heightCm().doubleValue();
    BigDecimal bmi =
        BigDecimal.valueOf(weight / Math.pow(height / 100.0, 2)).setScale(1, RoundingMode.HALF_UP);
    Ineligible reason = null;
    if (in.age() < 18 || in.age() > 65) reason = Ineligible.AGE;
    else if (in.pregnantOrBreastfeeding()) reason = Ineligible.PREGNANCY;
    else if (in.medicalCondition()) reason = Ineligible.MEDICAL;
    else if (bmi.compareTo(MIN_BMI) < 0 || bmi.compareTo(MAX_BMI) > 0) reason = Ineligible.BMI;
    if (reason != null)
      return new Targets(false, reason, in.age(), bmi, null, null, null, null, null, null);

    double resting = 10 * weight + 6.25 * height - 5 * in.age() + (in.sex() == Sex.MALE ? 5 : -161);
    double daily = resting * in.activity().factor;
    double calories = Math.max(daily * in.goal().energy, resting);
    double protein = weight * in.goal().proteinPerKg;
    double fat = calories * 0.30 / 9;
    double carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
    return new Targets(
        true,
        null,
        in.age(),
        bmi,
        roundTo10(resting),
        roundTo10(daily),
        roundTo10(calories),
        (int) Math.round(protein),
        (int) Math.round(carbs),
        (int) Math.round(fat));
  }

  private static int roundTo10(double value) {
    return (int) (Math.round(value / 10.0) * 10);
  }
}
