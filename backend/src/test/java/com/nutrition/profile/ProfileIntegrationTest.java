package com.nutrition.profile;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Year;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Nutrition profile (D32): own data only, consent required, deletable, targets from the DB row. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ProfileIntegrationTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private final UUID owner = UUID.randomUUID();
  private final UUID stranger = UUID.randomUUID();

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM nutrition_profiles WHERE user_id IN (?,?)", owner, stranger);
    db.update("DELETE FROM app_users WHERE id IN (?,?)", owner, stranger);
  }

  private MockHttpServletRequestBuilder as(MockHttpServletRequestBuilder request, UUID user) {
    return request.with(jwt().jwt(j -> j.subject(user.toString())));
  }

  private static String body(int age, boolean consent, String allergens) {
    int year = Year.now().getValue() - age;
    return """
        {"birth_year":%d,"sex":"MALE","height_cm":180,"weight_kg":80,"activity":"MODERATE",
         "goal":"MAINTAIN","excluded_allergens":[%s],"pregnant_or_breastfeeding":false,
         "medical_condition":false,"consent":%s}
        """
        .formatted(year, allergens, consent);
  }

  @Test
  void ownerSavesReadsGetsTargetsAndDeletes() throws Exception {
    http.perform(as(get("/api/me/profile"), owner)).andExpect(status().isNotFound());
    http.perform(
            as(put("/api/me/profile"), owner)
                .contentType("application/json")
                .content(body(30, true, "\"milk\",\"peanut\"")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.goal").value("MAINTAIN"))
        .andExpect(jsonPath("$.excluded_allergens[0]").value("milk"));
    http.perform(as(get("/api/me/targets"), owner))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.eligible").value(true))
        .andExpect(jsonPath("$.calories").value(2760))
        .andExpect(jsonPath("$.protein_g").value(80));
    // Another user sees nothing of it.
    http.perform(as(get("/api/me/profile"), stranger)).andExpect(status().isNotFound());
    http.perform(as(delete("/api/me/profile"), owner)).andExpect(status().isNoContent());
    http.perform(as(get("/api/me/profile"), owner)).andExpect(status().isNotFound());
  }

  @Test
  void consentAndValidAllergensAreRequiredAndMinorsGetNoTargets() throws Exception {
    http.perform(
            as(put("/api/me/profile"), owner)
                .contentType("application/json")
                .content(body(30, false, "")))
        .andExpect(status().isBadRequest());
    http.perform(
            as(put("/api/me/profile"), owner)
                .contentType("application/json")
                .content(body(30, true, "\"chocolate\"")))
        .andExpect(status().isBadRequest());
    http.perform(
            as(put("/api/me/profile"), owner)
                .contentType("application/json")
                .content(body(16, true, "")))
        .andExpect(status().isOk());
    http.perform(as(get("/api/me/targets"), owner))
        .andExpect(jsonPath("$.eligible").value(false))
        .andExpect(jsonPath("$.ineligible").value("AGE"))
        .andExpect(jsonPath("$.calories").doesNotExist());
  }

  @Test
  void anonymousCallersAreRejected() throws Exception {
    http.perform(get("/api/me/profile")).andExpect(status().isUnauthorized());
  }
}
