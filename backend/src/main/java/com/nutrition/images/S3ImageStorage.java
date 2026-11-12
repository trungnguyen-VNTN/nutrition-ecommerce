package com.nutrition.images;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Stores images in the private images bucket. Objects live under images/ so the CloudFront behavior
 * /images/* maps straight to them. Keys are random and never overwritten, so they can be cached for
 * a year.
 */
@Component
@ConditionalOnProperty(name = "nutrition.images.storage", havingValue = "s3")
public class S3ImageStorage implements ImageStorage {
  static final String PREFIX = "images/";
  private final S3Client s3;
  private final String bucket;

  public S3ImageStorage(@Value("${nutrition.images.bucket}") String bucket) {
    if (bucket == null || bucket.isBlank())
      throw new IllegalArgumentException("nutrition.images.bucket is required for S3 storage");
    this.bucket = bucket;
    this.s3 = S3Client.create();
  }

  @Override
  public void put(String key, byte[] data, ImageType type) {
    s3.putObject(
        PutObjectRequest.builder()
            .bucket(bucket)
            .key(PREFIX + key)
            .contentType(type.contentType())
            .cacheControl("public, max-age=31536000, immutable")
            .build(),
        RequestBody.fromBytes(data));
  }

  @Override
  public void delete(String key) {
    s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(PREFIX + key).build());
  }
}
