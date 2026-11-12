package com.nutrition.images;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Builds the public URL of a stored image (CloudFront /images on AWS, backend path locally). */
@Component
public class ImageUrls {
  private final String baseUrl;

  public ImageUrls(@Value("${nutrition.images.public-base-url:/api/local-images}") String baseUrl) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
  }

  public String url(String key) {
    return baseUrl + "/" + key;
  }
}
