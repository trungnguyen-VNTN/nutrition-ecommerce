package com.nutrition.images;

/** Stores image bytes under a server-generated key such as products/12/uuid.jpg. */
public interface ImageStorage {
  void put(String key, byte[] data, ImageType type);

  /** Best effort: a missing object is not an error. */
  void delete(String key);
}
