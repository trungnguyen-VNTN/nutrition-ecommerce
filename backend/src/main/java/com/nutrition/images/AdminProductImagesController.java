package com.nutrition.images;

import com.nutrition.images.ProductImageService.ProductImage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** ADMIN only (SecurityConfig protects /api/admin/**). */
@RestController
@RequestMapping("/api/admin/products/{productId}/images")
@Validated
public class AdminProductImagesController {
  private final ProductImageService images;

  public AdminProductImagesController(ProductImageService images) {
    this.images = images;
  }

  public record Order(@NotNull @Size(max = ProductImageService.MAX_IMAGES) List<Long> imageIds) {}

  @GetMapping
  public List<ProductImage> list(@PathVariable @Positive long productId) {
    return images.list(productId);
  }

  @PostMapping(consumes = "multipart/form-data")
  @ResponseStatus(HttpStatus.CREATED)
  public ProductImage upload(
      @PathVariable @Positive long productId, @RequestParam("file") MultipartFile file)
      throws IOException {
    if (file.getSize() > ProductImageService.MAX_BYTES) throw new ImageTooLargeException();
    return images.add(productId, file.getBytes());
  }

  @PutMapping("/order")
  public List<ProductImage> reorder(
      @PathVariable @Positive long productId, @Valid @RequestBody Order order) {
    return images.reorder(productId, order.imageIds());
  }

  @DeleteMapping("/{imageId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable @Positive long productId, @PathVariable @Positive long imageId) {
    images.delete(productId, imageId);
  }
}
