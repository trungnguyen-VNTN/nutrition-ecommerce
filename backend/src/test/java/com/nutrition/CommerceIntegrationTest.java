package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nutrition.commerce.CommerceService;
import com.nutrition.common.BusinessException;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class CommerceIntegrationTest {
  @Autowired CommerceService commerce;
  @Autowired JdbcTemplate db;
  @Autowired MockMvc http;
  private final UUID a = UUID.randomUUID();
  private final UUID b = UUID.randomUUID();
  private long product;

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active) VALUES ('test-only',10000,1,false) RETURNING id",
            Long.class);
    // Test fixtures are inactive outside this test and removed with their dependants.
    db.update("UPDATE products SET active=true WHERE id=?", product);
  }

  @AfterEach
  void cleanup() {
    db.update(
        "DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id IN (?,?))",
        a,
        b);
    db.update("DELETE FROM orders WHERE user_id IN (?,?)", a, b);
    db.update(
        "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id IN (?,?))",
        a,
        b);
    db.update("DELETE FROM carts WHERE user_id IN (?,?)", a, b);
    db.update("DELETE FROM app_users WHERE id IN (?,?)", a, b);
    db.update("DELETE FROM products WHERE id=?", product);
  }

  @Test
  void accessAndOwnershipAreEnforced() throws Exception {
    http.perform(get("/api/cart")).andExpect(status().isUnauthorized());
    http.perform(get("/api/cart").header("Authorization", "Bearer invalid"))
        .andExpect(status().isUnauthorized());
    http.perform(get("/api/admin/orders").with(jwt().jwt(j -> j.subject(a.toString()))))
        .andExpect(status().isForbidden());
    commerce.put(a, product, 1, true);
    long order = commerce.checkout(a, UUID.randomUUID(), "Test", "000", "Test address");
    http.perform(get("/api/orders/" + order).with(jwt().jwt(j -> j.subject(b.toString()))))
        .andExpect(status().isNotFound());
    http.perform(
            post("/api/orders/" + order + "/cancel").with(jwt().jwt(j -> j.subject(b.toString()))))
        .andExpect(status().isNotFound());
    http.perform(
            post("/api/cart/items")
                .with(jwt().jwt(j -> j.subject(a.toString())))
                .contentType("application/json")
                .content("{\"product_id\":1,\"quantity\":0}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void checkoutRetryAndCancellationAreIdempotent() {
    commerce.put(a, product, 1, true);
    UUID key = UUID.randomUUID();
    long order = commerce.checkout(a, key, "Test", "000", "Test address");
    assertThat(commerce.checkout(a, key, "Test", "000", "Test address")).isEqualTo(order);
    assertThat(commerce.cart(a).items()).isEmpty();
    commerce.cancel(a, order);
    commerce.cancel(a, order);
    assertThat(db.queryForObject("SELECT stock FROM products WHERE id=?", Integer.class, product))
        .isEqualTo(1);
  }

  @Test
  void concurrentCheckoutCannotOversellAndLosingCartSurvives() throws Exception {
    commerce.put(a, product, 1, true);
    commerce.put(b, product, 1, true);
    var gate = new CountDownLatch(1);
    try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
      var first = pool.submit(() -> buy(a, gate));
      var second = pool.submit(() -> buy(b, gate));
      gate.countDown();
      assertThat(first.get(15, TimeUnit.SECONDS) + second.get(15, TimeUnit.SECONDS)).isEqualTo(1);
    }
    assertThat(db.queryForObject("SELECT stock FROM products WHERE id=?", Integer.class, product))
        .isZero();
    assertThat(commerce.cart(a).items().size() + commerce.cart(b).items().size()).isEqualTo(1);
  }

  @Test
  void adminTransitionsEnforceStateAndDoNotRestoreStockTwice() {
    commerce.put(a, product, 1, true);
    long order = commerce.checkout(a, UUID.randomUUID(), "Test", "000", "Address");
    assertThatThrownBy(() -> commerce.transition(order, "DELIVERED"))
        .isInstanceOf(BusinessException.class);
    commerce.transition(order, "CONFIRMED");
    assertThatThrownBy(() -> commerce.cancel(a, order)).isInstanceOf(BusinessException.class);
    commerce.transition(order, "CANCELLED");
    commerce.transition(order, "CANCELLED");
    assertThat(db.queryForObject("SELECT stock FROM products WHERE id=?", Integer.class, product))
        .isEqualTo(1);
  }

  @Test
  void adminStockAndVisibilityRequireAdminRole() throws Exception {
    var path = "/api/admin/products/" + product + "/stock";
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(path)
                .contentType("application/json")
                .content("{\"stock\":5}"))
        .andExpect(status().isUnauthorized());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(path)
                .with(jwt().jwt(j -> j.subject(a.toString())))
                .contentType("application/json")
                .content("{\"stock\":5}"))
        .andExpect(status().isForbidden());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch(path)
                .with(
                    jwt()
                        .jwt(j -> j.subject(a.toString()))
                        .authorities(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                "ROLE_ADMIN")))
                .contentType("application/json")
                .content("{\"stock\":5}"))
        .andExpect(status().isOk());
    assertThat(db.queryForObject("SELECT stock FROM products WHERE id=?", Integer.class, product))
        .isEqualTo(5);
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                    "/api/admin/products/" + product)
                .with(
                    jwt()
                        .jwt(j -> j.subject(a.toString()))
                        .authorities(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                "ROLE_ADMIN"))))
        .andExpect(status().isOk());
    http.perform(get("/api/products/" + product)).andExpect(status().isNotFound());
  }

  private org.springframework.test.web.servlet.request.RequestPostProcessor admin() {
    return jwt()
        .jwt(j -> j.subject(a.toString()))
        .authorities(
            new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"));
  }

  @Test
  void nutritionCompletionIsDerivedAndUnknownValuesRemainNull() throws Exception {
    String path = "/api/admin/products/" + product + "/nutrition";
    String complete =
        "{\"serving_size\":100,\"serving_unit\":\"g\",\"calories\":0,\"protein_g\":1,\"carbs_g\":2,\"fat_g\":3,\"source\":\"test label\"}";
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .contentType("application/json")
                .content(complete))
        .andExpect(status().isUnauthorized());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(jwt())
                .contentType("application/json")
                .content(complete))
        .andExpect(status().isForbidden());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(admin())
                .contentType("application/json")
                .content(complete))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.nutrition_complete")
                .value(true));
    http.perform(get("/api/products/" + product))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.nutrition.calories")
                .value(0));
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(admin())
                .contentType("application/json")
                .content(complete.replace("\"protein_g\":1", "\"protein_g\":null")))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.nutrition_complete")
                .value(false));
    http.perform(get("/api/products/" + product))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.nutrition")
                .isEmpty());
  }

  @Test
  void adminCanReadShippingDetailsButRegularUsersCannot() throws Exception {
    commerce.put(a, product, 1, true);
    long order = commerce.checkout(a, UUID.randomUUID(), "Recipient", "000", "Delivery address");
    http.perform(get("/api/admin/orders/" + order).with(jwt().jwt(j -> j.subject(b.toString()))))
        .andExpect(status().isForbidden());
    http.perform(get("/api/admin/orders/" + order).with(admin()))
        .andExpect(status().isOk())
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.shipping_name")
                .value("Recipient"))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.created_at")
                .isString());
  }

  @Test
  void invalidAllergenReplacementRollsBackAndNullItemsAreRejected() throws Exception {
    String path = "/api/admin/products/" + product + "/allergens";
    String valid = "{\"verified\":true,\"items\":[{\"code\":\"peanut\",\"kind\":\"contains\"}]}";
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(admin())
                .contentType("application/json")
                .content(valid))
        .andExpect(status().isOk());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(admin())
                .contentType("application/json")
                .content(valid.replace("peanut", "unknown")))
        .andExpect(status().isBadRequest());
    http.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put(path)
                .with(admin())
                .contentType("application/json")
                .content("{\"verified\":false,\"items\":[null]}"))
        .andExpect(status().isBadRequest());
    http.perform(get("/api/products/" + product))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.allergens[0].code")
                .value("peanut"))
        .andExpect(
            org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath(
                    "$.allergens_verified")
                .value(true));
  }

  @Test
  void categoryCannotBeDeletedWhileReferenced() throws Exception {
    String slug = "test-" + UUID.randomUUID();
    String body = "{\"name\":\"" + slug + "\",\"slug\":\"" + slug + "\"}";
    http.perform(
            post("/api/admin/categories").with(jwt()).contentType("application/json").content(body))
        .andExpect(status().isForbidden());
    http.perform(
            post("/api/admin/categories")
                .with(admin())
                .contentType("application/json")
                .content(body))
        .andExpect(status().isOk());
    long category = db.queryForObject("SELECT id FROM categories WHERE slug=?", Long.class, slug);
    try {
      http.perform(
              post("/api/admin/categories")
                  .with(admin())
                  .contentType("application/json")
                  .content(body))
          .andExpect(status().isConflict());
      db.update("UPDATE products SET category_id=? WHERE id=?", category, product);
      http.perform(
              org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                      "/api/admin/categories/" + category)
                  .with(admin()))
          .andExpect(status().isConflict());
      assertThat(
              db.queryForObject(
                  "SELECT COUNT(*) FROM categories WHERE id=?", Integer.class, category))
          .isEqualTo(1);
      db.update("UPDATE products SET category_id=null WHERE id=?", product);
      http.perform(
              org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete(
                      "/api/admin/categories/" + category)
                  .with(admin()))
          .andExpect(status().isOk());
    } finally {
      db.update("UPDATE products SET category_id=null WHERE id=?", product);
      db.update("DELETE FROM categories WHERE id=?", category);
    }
  }

  private int buy(UUID user, CountDownLatch gate) throws InterruptedException {
    gate.await();
    try {
      commerce.checkout(user, UUID.randomUUID(), "Test", "000", "Test address");
      return 1;
    } catch (BusinessException error) {
      assertThat(error.code()).isEqualTo("OUT_OF_STOCK");
      return 0;
    }
  }

  @Test
  void failedCheckoutRollsBackAllChangesAndUsesCurrentPrice() {
    commerce.put(a, product, 1, true);
    db.update("UPDATE products SET stock=0 WHERE id=?", product);
    assertThatThrownBy(() -> commerce.checkout(a, UUID.randomUUID(), "Test", "000", "Address"))
        .isInstanceOf(BusinessException.class);
    assertThat(commerce.orders(a, 0, 20)).isEmpty();
    assertThat(commerce.cart(a).items()).hasSize(1);
    db.update("UPDATE products SET stock=1,price=12000 WHERE id=?", product);
    long id = commerce.checkout(a, UUID.randomUUID(), "Test", "000", "Address");
    assertThat(commerce.order(a, id).get("total").toString()).isEqualTo("12000.00");
  }
}
