package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nutrition.images.ImageType;
import com.nutrition.images.LocalImageStorage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ImageTypeTest {
  @Test
  void detectsFormatsFromContent() {
    assertThat(ImageType.detect(ProductImagesIntegrationTest.png())).contains(ImageType.PNG);
    assertThat(ImageType.detect(ProductImagesIntegrationTest.jpeg())).contains(ImageType.JPEG);
    byte[] webp = "RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);
    assertThat(ImageType.detect(webp)).contains(ImageType.WEBP);
    assertThat(ImageType.detect("<svg></svg> padding".getBytes(StandardCharsets.UTF_8))).isEmpty();
    assertThat(ImageType.detect(new byte[3])).isEmpty();
    assertThat(ImageType.detect(null)).isEmpty();
  }

  @Test
  void localStorageRejectsKeysOutsideItsRoot(@TempDir Path root) {
    LocalImageStorage storage = new LocalImageStorage(root.toString());
    assertThat(storage.resolve("products/1/a.png").startsWith(root.toAbsolutePath())).isTrue();
    assertThatThrownBy(() -> storage.resolve("../outside.png"))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
