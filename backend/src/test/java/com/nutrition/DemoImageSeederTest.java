package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nutrition.images.DemoImageSeeder;
import com.nutrition.images.ProductImageService;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@ActiveProfiles("local")
class DemoImageSeederTest {
  @TempDir static Path images;

  @DynamicPropertySource
  static void storage(DynamicPropertyRegistry registry) {
    registry.add("nutrition.images.local-dir", () -> images.toString());
  }

  @Autowired JdbcTemplate db;
  @Autowired ProductImageService service;
  @Autowired ResourceLoader resources;
  @Autowired ObjectMapper json;

  private long a;
  private long b;

  private long product(String name) {
    return db.queryForObject(
        "INSERT INTO products(name,price,stock,active) VALUES (?,1000,1,true) RETURNING id",
        Long.class,
        name);
  }

  private int count(long product) {
    return db.queryForObject(
        "SELECT count(*) FROM product_images WHERE product_id=?", Integer.class, product);
  }

  @BeforeEach
  void setup() {
    a = product("seed-test-a");
    b = product("seed-test-b");
    db.update(
        "INSERT INTO products(name,price,stock,active) VALUES ('seed-test-missing-file',1,1,true)");
  }

  @AfterEach
  void cleanup() {
    db.update("DELETE FROM products WHERE name LIKE 'seed-test-%'");
  }

  @Test
  void attachesOncePerProductAndNeverReplacesExistingPhotos() {
    // Product b already has a photo uploaded by an admin.
    service.add(b, ProductImagesIntegrationTest.png());
    var seeder =
        new DemoImageSeeder(db, service, resources, json, "classpath:test-seed/manifest.json");

    // Missing file and unknown product are skipped without failing the run.
    assertThat(seeder.seed()).isEqualTo(1);
    assertThat(count(a)).isEqualTo(1);
    assertThat(count(b)).isEqualTo(1);

    // Running again (every app start) adds nothing.
    assertThat(seeder.seed()).isZero();
    assertThat(count(a)).isEqualTo(1);
    List<String> keys =
        db.queryForList("SELECT s3_key FROM product_images WHERE product_id=?", String.class, a);
    assertThat(keys.getFirst()).startsWith("products/" + a + "/").endsWith(".png");
  }

  @Test
  void missingManifestDoesNothing() {
    var seeder = new DemoImageSeeder(db, service, resources, json, "classpath:test-seed/none.json");
    assertThat(seeder.seed()).isZero();
  }
}
