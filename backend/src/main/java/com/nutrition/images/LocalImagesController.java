package com.nutrition.images;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Serves locally stored images during development. On AWS, CloudFront serves /images/*. */
@RestController
@ConditionalOnProperty(
    name = "nutrition.images.storage",
    havingValue = "local",
    matchIfMissing = true)
public class LocalImagesController {
  private static final Pattern FILE =
      Pattern.compile(
          "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)");
  private final LocalImageStorage storage;

  public LocalImagesController(LocalImageStorage storage) {
    this.storage = storage;
  }

  @GetMapping("/api/local-images/products/{productId:\\d+}/{file}")
  public ResponseEntity<byte[]> image(@PathVariable String productId, @PathVariable String file)
      throws IOException {
    if (!FILE.matcher(file).matches()) return ResponseEntity.notFound().build();
    Path path = storage.resolve("products/" + productId + "/" + file);
    if (!Files.isRegularFile(path)) return ResponseEntity.notFound().build();
    byte[] data = Files.readAllBytes(path);
    ImageType type = ImageType.detect(data).orElse(null);
    if (type == null) return ResponseEntity.notFound().build();
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(type.contentType()))
        .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS))
        .header("X-Content-Type-Options", "nosniff")
        .body(data);
  }
}
