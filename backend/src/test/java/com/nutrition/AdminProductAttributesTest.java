package com.nutrition;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Admins set plant-based / liquid (D26); unknown plant-based never yields the label. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AdminProductAttributesTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private long product;

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active) VALUES ('attr-test',10000,1,true)"
                + " RETURNING id",
            Long.class);
  }

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM product_allergens WHERE product_id=?", product);
    db.update("DELETE FROM products WHERE id=?", product);
  }

  private MockHttpServletRequestBuilder admin(MockHttpServletRequestBuilder request) {
    return request.with(
        jwt()
            .jwt(j -> j.subject("00000000-0000-0000-0000-000000000001"))
            .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")));
  }

  private void attributes(String body) throws Exception {
    http.perform(
            admin(put("/api/admin/products/" + product + "/attributes"))
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk());
  }

  @Test
  void plantBasedLabelFollowsTheAdminChoiceAndUnknownFailsClosed() throws Exception {
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.diet_labels", Matchers.not(Matchers.hasItem("PLANT_BASED"))));

    attributes("{\"plant_based\":true,\"is_liquid\":true}");
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.diet_labels", Matchers.hasItem("PLANT_BASED")));
    http.perform(admin(get("/api/admin/products/" + product + "/data")))
        .andExpect(jsonPath("$.plant_based").value(true))
        .andExpect(jsonPath("$.is_liquid").value(true));

    attributes("{\"plant_based\":null,\"is_liquid\":false}");
    http.perform(get("/api/products/" + product))
        .andExpect(jsonPath("$.diet_labels", Matchers.not(Matchers.hasItem("PLANT_BASED"))));
  }

  @Test
  void customersCannotChangeAttributesAndLiquidIsRequired() throws Exception {
    http.perform(
            put("/api/admin/products/" + product + "/attributes")
                .with(jwt().jwt(j -> j.subject("00000000-0000-0000-0000-000000000002")))
                .contentType("application/json")
                .content("{\"plant_based\":true,\"is_liquid\":false}"))
        .andExpect(status().isForbidden());
    http.perform(
            admin(put("/api/admin/products/" + product + "/attributes"))
                .contentType("application/json")
                .content("{\"plant_based\":true}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void allNineAllergensCanBeRecorded() throws Exception {
    String items =
        db.queryForList("SELECT code FROM allergens ORDER BY id", String.class).stream()
            .map(code -> "{\"code\":\"" + code + "\",\"kind\":\"contains\"}")
            .reduce((a, b) -> a + "," + b)
            .orElseThrow();
    http.perform(
            admin(put("/api/admin/products/" + product + "/allergens"))
                .contentType("application/json")
                .content("{\"verified\":true,\"items\":[" + items + "]}"))
        .andExpect(status().isOk());
    http.perform(admin(get("/api/admin/products/" + product + "/data")))
        .andExpect(jsonPath("$.allergens.length()").value(Matchers.greaterThanOrEqualTo(9)));
  }
}
