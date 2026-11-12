package com.nutrition.images;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Attaches the bundled demo photos (CC0 / public domain, see seed-images/manifest.json) to demo
 * catalog products that have no image yet (D23). Goes through ProductImageService, so the same
 * format and size checks apply and the photo lands in S3 or local storage. Admin uploads are never
 * replaced, and a bad entry is logged without stopping the app.
 */
@Component
@ConditionalOnProperty(name = "nutrition.images.seed-demo", havingValue = "true")
public class DemoImageSeeder implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(DemoImageSeeder.class);

  private final JdbcTemplate db;
  private final ProductImageService images;
  private final ResourceLoader resources;
  private final ObjectMapper json;
  private final String manifest;

  public DemoImageSeeder(
      JdbcTemplate db,
      ProductImageService images,
      ResourceLoader resources,
      ObjectMapper json,
      @Value("${nutrition.images.seed-manifest:classpath:seed-images/manifest.json}")
          String manifest) {
    this.db = db;
    this.images = images;
    this.resources = resources;
    this.json = json;
    this.manifest = manifest;
  }

  @Override
  public void run(ApplicationArguments args) {
    seed();
  }

  /** Returns how many photos were attached. */
  public int seed() {
    Resource file = resources.getResource(manifest);
    if (!file.exists()) {
      log.warn("Demo image manifest not found: {}", manifest);
      return 0;
    }
    JsonNode entries;
    try (InputStream in = file.getInputStream()) {
      entries = json.readTree(in);
    } catch (IOException exception) {
      log.warn("Demo image manifest unreadable: {}", exception.getMessage());
      return 0;
    }
    String base = manifest.substring(0, manifest.lastIndexOf('/') + 1);
    int added = 0;
    for (JsonNode entry : entries) {
      String product = entry.path("product").asText();
      String image = entry.path("file").asText();
      try {
        List<Long> ids =
            db.queryForList(
                "SELECT p.id FROM products p WHERE p.name=? AND NOT EXISTS"
                    + " (SELECT 1 FROM product_images i WHERE i.product_id=p.id)",
                Long.class,
                product);
        if (ids.isEmpty()) continue;
        try (InputStream in = resources.getResource(base + image).getInputStream()) {
          images.add(ids.getFirst(), in.readAllBytes());
          added++;
        }
      } catch (IOException | RuntimeException exception) {
        log.warn("Demo image {} for '{}' skipped: {}", image, product, exception.getMessage());
      }
    }
    if (added > 0) log.info("Attached {} demo product photos", added);
    return added;
  }
}
