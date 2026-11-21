package com.nutrition.profile;

import static org.assertj.core.api.Assertions.assertThat;

import com.nutrition.profile.NutritionTargets.Activity;
import com.nutrition.profile.NutritionTargets.Goal;
import com.nutrition.profile.NutritionTargets.Ineligible;
import com.nutrition.profile.NutritionTargets.Input;
import com.nutrition.profile.NutritionTargets.Sex;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class NutritionTargetsTest {
  private static Input input(
      int age, Sex sex, int height, int weight, Activity activity, Goal goal) {
    return new Input(
        age,
        sex,
        BigDecimal.valueOf(height),
        BigDecimal.valueOf(weight),
        activity,
        goal,
        false,
        false);
  }

  @Test
  void mifflinStJeorWithActivityAndMaintenance() {
    // Resting: 10*80 + 6.25*180 - 5*30 + 5 = 1780; daily 1780 * 1.55 = 2759.
    var t =
        NutritionTargets.compute(input(30, Sex.MALE, 180, 80, Activity.MODERATE, Goal.MAINTAIN));
    assertThat(t.eligible()).isTrue();
    assertThat(t.restingCalories()).isEqualTo(1780);
    assertThat(t.dailyCalories()).isEqualTo(2760);
    assertThat(t.calories()).isEqualTo(2760);
    assertThat(t.proteinG()).isEqualTo(80);
    assertThat(t.fatG()).isEqualTo(92);
    assertThat(t.carbsG()).isEqualTo(403);
    assertThat(t.bmi()).isEqualByComparingTo("24.7");
  }

  @Test
  void weightLossKeepsAboveRestingEnergyAndRaisesProtein() {
    // Resting: 550 + 1000 - 125 - 161 = 1264; daily 1516.8; minus 15% = 1289.3.
    var t = NutritionTargets.compute(input(25, Sex.FEMALE, 160, 55, Activity.SEDENTARY, Goal.LOSE));
    assertThat(t.calories()).isEqualTo(1290);
    assertThat(t.calories()).isGreaterThanOrEqualTo(t.restingCalories());
    assertThat(t.proteinG()).isEqualTo(66);
    assertThat(t.fatG()).isEqualTo(43);
    assertThat(t.carbsG()).isEqualTo(160);
  }

  @Test
  void carbsStayInsideTheUsualRangeForTypicalAdults() {
    for (Goal goal : Goal.values())
      for (Activity activity : Activity.values()) {
        var t = NutritionTargets.compute(input(40, Sex.FEMALE, 165, 62, activity, goal));
        double carbShare = t.carbsG() * 4.0 / t.calories();
        assertThat(carbShare).as("%s %s", goal, activity).isBetween(0.40, 0.65);
      }
  }

  @Test
  void peopleTheEstimateIsNotMeantForGetNoTargets() {
    assertThat(NutritionTargets.compute(input(17, Sex.MALE, 175, 65, Activity.LIGHT, Goal.LOSE)))
        .extracting(NutritionTargets.Targets::eligible, NutritionTargets.Targets::ineligible)
        .containsExactly(false, Ineligible.AGE);
    assertThat(
            NutritionTargets.compute(input(70, Sex.MALE, 175, 65, Activity.LIGHT, Goal.LOSE))
                .ineligible())
        .isEqualTo(Ineligible.AGE);
    var pregnant =
        new Input(
            30,
            Sex.FEMALE,
            BigDecimal.valueOf(160),
            BigDecimal.valueOf(60),
            Activity.LIGHT,
            Goal.LOSE,
            true,
            false);
    assertThat(NutritionTargets.compute(pregnant).ineligible()).isEqualTo(Ineligible.PREGNANCY);
    var medical =
        new Input(
            30,
            Sex.MALE,
            BigDecimal.valueOf(170),
            BigDecimal.valueOf(70),
            Activity.LIGHT,
            Goal.MAINTAIN,
            false,
            true);
    var refused = NutritionTargets.compute(medical);
    assertThat(refused.ineligible()).isEqualTo(Ineligible.MEDICAL);
    assertThat(refused.calories()).isNull();
    // BMI 14.7 and 41.5 are outside 17-35.
    assertThat(
            NutritionTargets.compute(input(30, Sex.MALE, 175, 45, Activity.LIGHT, Goal.GAIN_MUSCLE))
                .ineligible())
        .isEqualTo(Ineligible.BMI);
    assertThat(
            NutritionTargets.compute(input(30, Sex.MALE, 170, 120, Activity.LIGHT, Goal.LOSE))
                .ineligible())
        .isEqualTo(Ineligible.BMI);
  }
}
