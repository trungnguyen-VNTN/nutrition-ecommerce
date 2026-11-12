package com.nutrition.images;

/** The upload exceeds the size limit. */
public class ImageTooLargeException extends RuntimeException {
  public ImageTooLargeException() {
    super("Image too large");
  }
}
