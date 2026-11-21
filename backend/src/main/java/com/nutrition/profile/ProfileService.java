package com.nutrition.profile;

import com.nutrition.profile.NutritionTargets.Activity;
import com.nutrition.profile.NutritionTargets.Goal;
import com.nutrition.profile.NutritionTargets.Sex;
import com.nutrition.profile.NutritionTargets.Targets;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.Year;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nutrition profile of the signed-in user (D32). The user id always comes from the JWT subject
 * (invariant 1). Body data is never logged (invariant 4) and never sent to the language model.
 */
@Service
public class ProfileService {
  public record Profile(
      int birthYear,
      Sex sex,
      BigDecimal heightCm,
      BigDecimal weightKg,
      Activity activity,
      Goal goal,
      List<String> excludedAllergens,
      boolean pregnantOrBreastfeeding,
      boolean medicalCondition,
      OffsetDateTime updatedAt) {}

  private final JdbcTemplate db;
  private final Clock clock;

  @Autowired
  public ProfileService(JdbcTemplate db) {
    this(db, Clock.systemUTC());
  }

  ProfileService(JdbcTemplate db, Clock clock) {
    this.db = db;
    this.clock = clock;
  }

  int currentYear() {
    return Year.now(clock.withZone(ZoneOffset.UTC)).getValue();
  }

  @Transactional(readOnly = true)
  public Profile get(UUID user) {
    var rows = db.query("SELECT * FROM nutrition_profiles WHERE user_id=?", this::map, user);
    if (rows.isEmpty()) throw new NoSuchElementException();
    return rows.getFirst();
  }

  /** Creates or replaces the caller's profile; allergen codes must exist in the allergens table. */
  @Transactional
  public Profile save(UUID user, Profile input) {
    int age = currentYear() - input.birthYear();
    if (age < 0 || age > 120) throw new IllegalArgumentException("Birth year");
    List<String> codes =
        input.excludedAllergens() == null
            ? List.of()
            : input.excludedAllergens().stream().distinct().sorted().toList();
    if (!codes.isEmpty()) {
      Integer known =
          db.queryForObject(
              "SELECT count(*) FROM allergens WHERE code = ANY (CAST(? AS text[]))",
              Integer.class,
              pgArray(codes));
      if (known == null || known != codes.size())
        throw new IllegalArgumentException("Unknown allergen");
    }
    db.update("INSERT INTO app_users(id) VALUES (?) ON CONFLICT DO NOTHING", user);
    db.update(
        """
        INSERT INTO nutrition_profiles(user_id,birth_year,sex,height_cm,weight_kg,activity,goal,
            excluded_allergens,pregnant_or_breastfeeding,medical_condition,consent_at,updated_at)
        VALUES (?,?,?,?,?,?,?,CAST(? AS text[]),?,?,now(),now())
        ON CONFLICT (user_id) DO UPDATE SET birth_year=EXCLUDED.birth_year,sex=EXCLUDED.sex,
            height_cm=EXCLUDED.height_cm,weight_kg=EXCLUDED.weight_kg,activity=EXCLUDED.activity,
            goal=EXCLUDED.goal,excluded_allergens=EXCLUDED.excluded_allergens,
            pregnant_or_breastfeeding=EXCLUDED.pregnant_or_breastfeeding,
            medical_condition=EXCLUDED.medical_condition,consent_at=now(),updated_at=now()
        """,
        user,
        input.birthYear(),
        input.sex().name(),
        input.heightCm(),
        input.weightKg(),
        input.activity().name(),
        input.goal().name(),
        pgArray(codes),
        input.pregnantOrBreastfeeding(),
        input.medicalCondition());
    return get(user);
  }

  @Transactional
  public void delete(UUID user) {
    db.update("DELETE FROM nutrition_profiles WHERE user_id=?", user);
  }

  @Transactional(readOnly = true)
  public Targets targets(UUID user) {
    return targets(get(user));
  }

  public Targets targets(Profile profile) {
    return NutritionTargets.compute(
        new NutritionTargets.Input(
            currentYear() - profile.birthYear(),
            profile.sex(),
            profile.heightCm(),
            profile.weightKg(),
            profile.activity(),
            profile.goal(),
            profile.pregnantOrBreastfeeding(),
            profile.medicalCondition()));
  }

  /** Codes are validated against [a-z_] before this, so a literal array is safe. */
  private static String pgArray(List<String> codes) {
    for (String code : codes)
      if (!code.matches("[a-z_]{1,40}")) throw new IllegalArgumentException("Allergen code");
    return "{" + String.join(",", codes) + "}";
  }

  private Profile map(ResultSet rs, int row) throws SQLException {
    String[] codes = (String[]) rs.getArray("excluded_allergens").getArray();
    return new Profile(
        rs.getInt("birth_year"),
        Sex.valueOf(rs.getString("sex")),
        rs.getBigDecimal("height_cm"),
        rs.getBigDecimal("weight_kg"),
        Activity.valueOf(rs.getString("activity")),
        Goal.valueOf(rs.getString("goal")),
        Arrays.asList(codes),
        rs.getBoolean("pregnant_or_breastfeeding"),
        rs.getBoolean("medical_condition"),
        rs.getObject("updated_at", OffsetDateTime.class));
  }
}
