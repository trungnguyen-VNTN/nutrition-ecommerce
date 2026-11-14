package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** "Đã xác minh" is shown only after an admin confirms the allergen list (phase 7 review). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AdminAllergenReviewTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private long product;

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active,allergens_verified)"
                + " VALUES ('review-test',10000,1,true,true) RETURNING id",
            Long.class);
  }

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM product_allergens WHERE product_id=?", product);
    db.update("DELETE FROM products WHERE id=?", product);
  }

  @Test
  void onlyAnAdminConfirmationMarksAllergensReviewed() throws Exception {
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.allergens_verified").value(true))
        .andExpect(jsonPath("$.allergens_reviewed").value(false));

    saveAllergens(true);
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.allergens_reviewed").value(true));
    assertThat(
            db.queryForObject(
                "SELECT allergens_reviewed_at IS NOT NULL FROM products WHERE id=?",
                Boolean.class,
                product))
        .isTrue();

    saveAllergens(false);
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.allergens_verified").value(false))
        .andExpect(jsonPath("$.allergens_reviewed").value(false));
  }

  private void saveAllergens(boolean verified) throws Exception {
    http.perform(
            put("/api/admin/products/" + product + "/allergens")
                .with(
                    jwt()
                        .jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
                        .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType("application/json")
                .content(
                    "{\"verified\":"
                        + verified
                        + ",\"items\":[{\"code\":\"milk\",\"kind\":\"contains\"}]}"))
        .andExpect(status().isOk());
  }
}
