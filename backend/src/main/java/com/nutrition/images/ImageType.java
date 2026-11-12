package com.nutrition.images;

import java.util.Arrays;
import java.util.Optional;

/** Accepted image formats, detected from file content (magic bytes), never from the name. */
public enum ImageType {
  JPEG("image/jpeg", "jpg"),
  PNG("image/png", "png"),
  WEBP("image/webp", "webp");

  private final String contentType;
  private final String extension;

  ImageType(String contentType, String extension) {
    this.contentType = contentType;
    this.extension = extension;
  }

  public String contentType() {
    return contentType;
  }

  public String extension() {
    return extension;
  }

  public static Optional<ImageType> detect(byte[] data) {
    if (data == null || data.length < 12) return Optional.empty();
    if (startsWith(data, 0, 0xFF, 0xD8, 0xFF)) return Optional.of(JPEG);
    if (startsWith(data, 0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))
      return Optional.of(PNG);
    if (startsWith(data, 0, 'R', 'I', 'F', 'F') && startsWith(data, 8, 'W', 'E', 'B', 'P'))
      return Optional.of(WEBP);
    return Optional.empty();
  }

  public static Optional<ImageType> fromContentType(String contentType) {
    return Arrays.stream(values()).filter(t -> t.contentType.equals(contentType)).findFirst();
  }

  private static boolean startsWith(byte[] data, int offset, int... expected) {
    for (int i = 0; i < expected.length; i++)
      if ((data[offset + i] & 0xFF) != expected[i]) return false;
    return true;
  }
}
