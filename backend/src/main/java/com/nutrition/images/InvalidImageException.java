package com.nutrition.images;

/** The upload is not a JPEG, PNG or WebP image. */
public class InvalidImageException extends RuntimeException {
  public InvalidImageException() {
    super("Unsupported image");
  }
}
