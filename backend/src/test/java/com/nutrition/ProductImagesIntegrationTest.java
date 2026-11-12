package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local")
class ProductImagesIntegrationTest {
  @TempDir static Path images;

  @DynamicPropertySource
  static void storage(DynamicPropertyRegistry registry) {
    registry.add("nutrition.images.local-dir", () -> images.toString());
  }

  @Autowired MockMvc http;
  @Autowired JdbcTemplate db;
  @Autowired ObjectMapper json;
  private long product;

  private static final RequestPostProcessor ADMIN =
      jwt().jwt(j -> j.subject("admin-test")).authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
  private static final RequestPostProcessor USER =
      jwt().jwt(j -> j.subject("user-test")).authorities(new SimpleGrantedAuthority("ROLE_USER"));

  static byte[] png() {
    byte[] data = new byte[64];
    byte[] header = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    System.arraycopy(header, 0, data, 0, header.length);
    return data;
  }

  static byte[] jpeg() {
    byte[] data = new byte[64];
    data[0] = (byte) 0xFF;
    data[1] = (byte) 0xD8;
    data[2] = (byte) 0xFF;
    return data;
  }

  static MockMultipartFile file(byte[] data, String name, String type) {
    return new MockMultipartFile("file", name, type, data);
  }

  private String base() {
    return "/api/admin/products/" + product + "/images";
  }

  private JsonNode upload(byte[] data) throws Exception {
    String body =
        http.perform(multipart(base()).file(file(data, "a.png", "image/png")).with(ADMIN))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    return json.readTree(body);
  }

  @BeforeEach
  void setup() {
    product =
        db.queryForObject(
            "INSERT INTO products(name,price,stock,active) VALUES ('image-test',10000,1,true)"
                + " RETURNING id",
            Long.class);
  }

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM products WHERE id=?", product);
  }

  @Test
  void uploadShowsInCatalogReorderAndDelete() throws Exception {
    JsonNode first = upload(png());
    assertThat(first.path("url").asText())
        .startsWith("/api/local-images/products/" + product + "/")
        .endsWith(".png");
    assertThat(first.path("sort_order").asInt()).isZero();
    JsonNode second = upload(jpeg());
    assertThat(second.path("url").asText()).endsWith(".jpg");

    http.perform(get("/api/products/" + product))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.images.length()").value(2))
        .andExpect(jsonPath("$.images[0].url").value(first.path("url").asText()));

    http.perform(get(first.path("url").asText()))
        .andExpect(status().isOk())
        .andExpect(content().contentType("image/png"))
        .andExpect(content().bytes(png()));

    String order =
        "{\"image_ids\":[" + second.path("id").asLong() + "," + first.path("id").asLong() + "]}";
    http.perform(put(base() + "/order").with(ADMIN).contentType("application/json").content(order))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].id").value(second.path("id").asLong()));
    http.perform(
            put(base() + "/order")
                .with(ADMIN)
                .contentType("application/json")
                .content("{\"image_ids\":[" + first.path("id").asLong() + "]}"))
        .andExpect(status().isBadRequest());

    String fileName = second.path("url").asText().replaceFirst(".*/", "");
    Path stored = images.resolve("products").resolve(String.valueOf(product)).resolve(fileName);
    assertThat(stored).exists();
    http.perform(delete(base() + "/" + second.path("id").asLong()).with(ADMIN))
        .andExpect(status().isNoContent());
    assertThat(stored).doesNotExist();
    http.perform(get(base()).with(ADMIN))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].sort_order").value(0));
  }

  @Test
  void rejectsFilesThatAreNotSupportedImages() throws Exception {
    byte[] text = "hello, this is not an image".getBytes(StandardCharsets.UTF_8);
    byte[] svg =
        "<svg xmlns=\"http://www.w3.org/2000/svg\"><script>alert(1)</script></svg>"
            .getBytes(StandardCharsets.UTF_8);
    for (byte[] data : new byte[][] {text, svg, new byte[0]})
      http.perform(multipart(base()).file(file(data, "fake.png", "image/png")).with(ADMIN))
          .andExpect(status().isBadRequest());
    http.perform(multipart(base()).file(file(svg, "x.svg", "image/svg+xml")).with(ADMIN))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_IMAGE"));

    byte[] big = Arrays.copyOf(png(), 2 * 1024 * 1024 + 1);
    http.perform(multipart(base()).file(file(big, "big.png", "image/png")).with(ADMIN))
        .andExpect(status().isPayloadTooLarge())
        .andExpect(jsonPath("$.code").value("IMAGE_TOO_LARGE"));
    assertThat(
            db.queryForObject(
                "SELECT count(*) FROM product_images WHERE product_id=?", Integer.class, product))
        .isZero();
  }

  @Test
  void cartShowsThePrimaryImage() throws Exception {
    java.util.UUID shopper = java.util.UUID.randomUUID();
    RequestPostProcessor user = jwt().jwt(j -> j.subject(shopper.toString()));
    try {
      http.perform(
              org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                      "/api/cart/items")
                  .with(user)
                  .contentType("application/json")
                  .content("{\"product_id\":" + product + ",\"quantity\":1}"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.items[0].image_url").doesNotExist());
      JsonNode primary = upload(png());
      upload(jpeg());
      http.perform(get("/api/cart").with(user))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.items[0].image_url").value(primary.path("url").asText()));
    } finally {
      db.update(
          "DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE user_id=?)",
          shopper);
      db.update("DELETE FROM carts WHERE user_id=?", shopper);
      db.update("DELETE FROM app_users WHERE id=?", shopper);
    }
  }

  @Test
  void limitsImagesPerProduct() throws Exception {
    for (int i = 0; i < 5; i++) upload(png());
    http.perform(multipart(base()).file(file(png(), "6.png", "image/png")).with(ADMIN))
        .andExpect(status().isConflict())
        .andExpect(jsonPath("$.code").value("IMAGE_LIMIT"));
  }

  @Test
  void onlyAdminsCanManageImages() throws Exception {
    http.perform(multipart(base()).file(file(png(), "a.png", "image/png")))
        .andExpect(status().isUnauthorized());
    http.perform(multipart(base()).file(file(png(), "a.png", "image/png")).with(USER))
        .andExpect(status().isForbidden());
    http.perform(get(base()).with(USER)).andExpect(status().isForbidden());
    http.perform(
            multipart("/api/admin/products/999999999/images")
                .file(file(png(), "a.png", "image/png"))
                .with(ADMIN))
        .andExpect(status().isNotFound());
  }

  @Test
  void localImagesEndpointOnlyServesGeneratedNames() throws Exception {
    Files.createDirectories(images.resolve("products/1"));
    Files.write(images.resolve("secret.txt"), "x".getBytes(StandardCharsets.UTF_8));
    http.perform(get("/api/local-images/products/1/..%2F..%2Fsecret.txt"))
        .andExpect(status().is4xxClientError());
    http.perform(get("/api/local-images/products/1/not-a-uuid.png"))
        .andExpect(status().isNotFound());
  }
}
