package com.nutrition.images;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Stores images on the local disk so the app runs without AWS. Not used in production. */
@Component
@ConditionalOnProperty(
    name = "nutrition.images.storage",
    havingValue = "local",
    matchIfMissing = true)
public class LocalImageStorage implements ImageStorage {
  private final Path root;

  public LocalImageStorage(
      @Value("${nutrition.images.local-dir:../.local-run/images}") String directory) {
    this.root = Path.of(directory).toAbsolutePath().normalize();
  }

  @Override
  public void put(String key, byte[] data, ImageType type) {
    Path target = resolve(key);
    try {
      Files.createDirectories(target.getParent());
      Files.write(target, data);
    } catch (IOException exception) {
      throw new UncheckedIOException(exception);
    }
  }

  @Override
  public void delete(String key) {
    try {
      Files.deleteIfExists(resolve(key));
    } catch (IOException exception) {
      throw new UncheckedIOException(exception);
    }
  }

  /** Resolves a key inside the root; anything escaping it is rejected. */
  public Path resolve(String key) {
    Path target = root.resolve(key).normalize();
    if (!target.startsWith(root)) throw new IllegalArgumentException("Invalid image key");
    return target;
  }
}
