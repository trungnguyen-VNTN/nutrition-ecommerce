package com.nutrition.profile;

import com.nutrition.profile.NutritionTargets.Activity;
import com.nutrition.profile.NutritionTargets.Goal;
import com.nutrition.profile.NutritionTargets.Sex;
import com.nutrition.profile.NutritionTargets.Targets;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The caller's own nutrition profile and estimated daily targets (D32). Identity from the JWT. */
@RestController
@RequestMapping("/api/me")
@Validated
public class ProfileController {
  private final ProfileService profiles;
  private final RecommendationService recommendations;

  public ProfileController(ProfileService profiles, RecommendationService recommendations) {
    this.profiles = profiles;
    this.recommendations = recommendations;
  }

  public record Input(
      @NotNull @Min(1900) @Max(2100) Integer birthYear,
      @NotNull Sex sex,
      @NotNull @DecimalMin("100") @DecimalMax("250") @Digits(integer = 3, fraction = 1)
          BigDecimal heightCm,
      @NotNull @DecimalMin("30") @DecimalMax("300") @Digits(integer = 3, fraction = 1)
          BigDecimal weightKg,
      @NotNull Activity activity,
      @NotNull Goal goal,
      @Size(max = 20) List<@NotNull @Pattern(regexp = "[a-z_]{1,40}") String> excludedAllergens,
      boolean pregnantOrBreastfeeding,
      boolean medicalCondition,
      /** The user must agree that body data is stored for estimates only. */
      @AssertTrue boolean consent) {}

  private static UUID user(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  @GetMapping("/profile")
  public ProfileService.Profile get(@AuthenticationPrincipal Jwt jwt) {
    return profiles.get(user(jwt));
  }

  @PutMapping("/profile")
  public ProfileService.Profile save(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Input input) {
    return profiles.save(
        user(jwt),
        new ProfileService.Profile(
            input.birthYear(),
            input.sex(),
            input.heightCm(),
            input.weightKg(),
            input.activity(),
            input.goal(),
            input.excludedAllergens(),
            input.pregnantOrBreastfeeding(),
            input.medicalCondition(),
            null));
  }

  @DeleteMapping("/profile")
  public ResponseEntity<Void> delete(@AuthenticationPrincipal Jwt jwt) {
    profiles.delete(user(jwt));
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/targets")
  public Targets targets(@AuthenticationPrincipal Jwt jwt) {
    return profiles.targets(user(jwt));
  }

  /** One meal toward the caller's targets; allergens from the profile plus {@code exclude}. */
  @GetMapping("/recommendations")
  public RecommendationService.Recommendation recommendations(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "LUNCH") RecommendationService.Meal meal,
      @RequestParam(required = false) @Size(max = 20)
          List<@Pattern(regexp = "[a-z_]{1,40}") String> exclude,
      @RequestParam(required = false) @Size(max = 6) List<com.nutrition.catalog.DietLabel> labels) {
    return recommendations.recommend(user(jwt), meal, exclude, labels);
  }
}
