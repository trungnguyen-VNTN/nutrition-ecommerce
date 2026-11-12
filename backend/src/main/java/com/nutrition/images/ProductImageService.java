package com.nutrition.images;

import com.nutrition.common.BusinessException;
import java.util.HashSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductImageService {
  public static final int MAX_IMAGES = 5;
  public static final int MAX_BYTES = 2 * 1024 * 1024;

  public record ProductImage(long id, String url, int sortOrder) {}

  private final JdbcTemplate db;
  private final ImageStorage storage;
  private final ImageUrls urls;

  public ProductImageService(JdbcTemplate db, ImageStorage storage, ImageUrls urls) {
    this.db = db;
    this.storage = storage;
    this.urls = urls;
  }

  @Transactional(readOnly = true)
  public List<ProductImage> list(long productId) {
    requireProduct(productId, false);
    return query(productId);
  }

  @Transactional
  public ProductImage add(long productId, byte[] data) {
    if (data == null || data.length == 0) throw new InvalidImageException();
    if (data.length > MAX_BYTES) throw new ImageTooLargeException();
    ImageType type = ImageType.detect(data).orElseThrow(InvalidImageException::new);
    // Row lock serializes concurrent uploads so the limit cannot be exceeded.
    requireProduct(productId, true);
    Integer counted =
        db.queryForObject(
            "SELECT count(*) FROM product_images WHERE product_id=?", Integer.class, productId);
    int count = counted == null ? 0 : counted;
    if (count >= MAX_IMAGES)
      throw new BusinessException("IMAGE_LIMIT", "Mỗi sản phẩm có tối đa 5 ảnh.");
    String key = "products/" + productId + "/" + UUID.randomUUID() + "." + type.extension();
    storage.put(key, data, type);
    try {
      Long id =
          db.queryForObject(
              "INSERT INTO product_images(product_id,s3_key,content_type,sort_order)"
                  + " VALUES (?,?,?,?) RETURNING id",
              Long.class,
              productId,
              key,
              type.contentType(),
              count);
      return new ProductImage(id, urls.url(key), count);
    } catch (RuntimeException exception) {
      storage.delete(key);
      throw exception;
    }
  }

  @Transactional
  public void delete(long productId, long imageId) {
    List<String> keys =
        db.queryForList(
            "DELETE FROM product_images WHERE id=? AND product_id=? RETURNING s3_key",
            String.class,
            imageId,
            productId);
    if (keys.isEmpty()) throw new NoSuchElementException();
    renumber(productId);
    storage.delete(keys.getFirst());
  }

  @Transactional
  public List<ProductImage> reorder(long productId, List<Long> imageIds) {
    requireProduct(productId, true);
    List<Long> current = ids(productId);
    if (imageIds == null
        || imageIds.size() != current.size()
        || !new HashSet<>(imageIds).equals(new HashSet<>(current)))
      throw new IllegalArgumentException("Image list must contain each image exactly once");
    for (int i = 0; i < imageIds.size(); i++)
      db.update(
          "UPDATE product_images SET sort_order=? WHERE id=? AND product_id=?",
          i,
          imageIds.get(i),
          productId);
    return query(productId);
  }

  private List<ProductImage> query(long productId) {
    return db.query(
        "SELECT id,s3_key,sort_order FROM product_images WHERE product_id=? ORDER BY sort_order,id",
        (rs, row) ->
            new ProductImage(
                rs.getLong("id"), urls.url(rs.getString("s3_key")), rs.getInt("sort_order")),
        productId);
  }

  private List<Long> ids(long productId) {
    return db.queryForList(
        "SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id",
        Long.class,
        productId);
  }

  private void renumber(long productId) {
    List<Long> ids = ids(productId);
    for (int i = 0; i < ids.size(); i++)
      db.update("UPDATE product_images SET sort_order=? WHERE id=?", i, ids.get(i));
  }

  private void requireProduct(long productId, boolean lock) {
    List<Long> found =
        db.queryForList(
            "SELECT id FROM products WHERE id=?" + (lock ? " FOR UPDATE" : ""),
            Long.class,
            productId);
    if (found.isEmpty()) throw new NoSuchElementException();
  }
}
