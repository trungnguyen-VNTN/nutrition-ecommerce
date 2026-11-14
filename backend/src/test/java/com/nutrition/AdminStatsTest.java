package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class AdminStatsTest {
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private final UUID customer = UUID.randomUUID();
  private long product;

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active) VALUES ('stats-low',1000,1,true) RETURNING id",
            Long.class);
    db.update("INSERT INTO app_users(id) VALUES (?)", customer);
    for (String status : new String[] {"PLACED", "CANCELLED"})
      db.update(
          "INSERT INTO orders(user_id,status,total,currency,shipping_name,phone,address,request_key)"
              + " VALUES (?,?,50000,'VND','Secret Name','0900000000','Secret Street',?)",
          customer,
          status,
          UUID.randomUUID());
  }

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM orders WHERE user_id=?", customer);
    db.update("DELETE FROM app_users WHERE id=?", customer);
    db.update("DELETE FROM products WHERE id=?", product);
  }

  @Test
  void adminsSeeAggregatesWithoutCustomerDetails() throws Exception {
    String body =
        http.perform(
                get("/api/admin/stats")
                    .with(
                        jwt()
                            .jwt(j -> j.subject(customer.toString()))
                            .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.orders.by_status.PLACED").value(1))
            .andExpect(jsonPath("$.orders.by_status.CANCELLED").value(1))
            .andExpect(jsonPath("$.orders.total").value(2))
            // Cancelled orders do not count as revenue.
            .andExpect(jsonPath("$.orders.revenue").value(50000.0))
            .andExpect(jsonPath("$.recent_days.length()").value(7))
            .andExpect(jsonPath("$.recent_days[6].orders").value(2))
            .andExpect(jsonPath("$.low_stock_threshold").value(5))
            .andExpect(jsonPath("$.low_stock_items[?(@.name=='stats-low')].stock").value(1))
            .andReturn()
            .getResponse()
            .getContentAsString();
    assertThat(body).doesNotContain("Secret", "0900000000", customer.toString());
  }

  @Test
  void customersCannotReadStats() throws Exception {
    http.perform(get("/api/admin/stats").with(jwt().jwt(j -> j.subject(customer.toString()))))
        .andExpect(status().isForbidden());
    http.perform(get("/api/admin/stats")).andExpect(status().isUnauthorized());
  }
}
