package com.nutrition.common;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class ApiExceptionHandler {
  public record ApiError(String code, String message, Map<String, Object> details) {}

  @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
  public ResponseEntity<ApiError> dataConflict() {
    return ResponseEntity.status(409)
        .body(
            new ApiError(
                "DATA_CONFLICT", "Dữ liệu đã tồn tại hoặc vẫn đang được sử dụng.", Map.of()));
  }

  @ExceptionHandler(com.nutrition.ai.AiUnavailableException.class)
  public ResponseEntity<ApiError> aiUnavailable() {
    return ResponseEntity.status(503)
        .body(new ApiError("AI_UNAVAILABLE", "Tra cứu AI tạm thời chưa sẵn sàng.", Map.of()));
  }

  @ExceptionHandler(com.nutrition.ai.ChatService.QuotaExceeded.class)
  public ResponseEntity<ApiError> quota() {
    return ResponseEntity.status(429)
        .body(new ApiError("QUOTA_EXCEEDED", "Đã hết lượt tra cứu hôm nay.", Map.of()));
  }

  @ExceptionHandler(com.nutrition.images.InvalidImageException.class)
  public ResponseEntity<ApiError> invalidImage() {
    return ResponseEntity.badRequest()
        .body(new ApiError("INVALID_IMAGE", "Chỉ nhận ảnh JPEG, PNG hoặc WebP.", Map.of()));
  }

  @ExceptionHandler({
    com.nutrition.images.ImageTooLargeException.class,
    org.springframework.web.multipart.MaxUploadSizeExceededException.class
  })
  public ResponseEntity<ApiError> imageTooLarge() {
    return ResponseEntity.status(413)
        .body(new ApiError("IMAGE_TOO_LARGE", "Ảnh tối đa 2 MB.", Map.of()));
  }

  @ExceptionHandler(BusinessException.class)
  public ResponseEntity<ApiError> conflict(BusinessException exception) {
    return ResponseEntity.status(409)
        .body(new ApiError(exception.code(), exception.getMessage(), Map.of()));
  }

  @ExceptionHandler({
    ConstraintViolationException.class,
    MethodArgumentTypeMismatchException.class,
    IllegalArgumentException.class,
    org.springframework.web.bind.MethodArgumentNotValidException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.multipart.support.MissingServletRequestPartException.class,
    org.springframework.web.bind.MissingServletRequestParameterException.class,
    org.springframework.web.multipart.MultipartException.class
  })
  public ResponseEntity<ApiError> invalid(Exception exception) {
    return ResponseEntity.badRequest()
        .body(new ApiError("INVALID_REQUEST", "Tham số không hợp lệ.", Map.of()));
  }

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<ApiError> missing(NoSuchElementException exception) {
    return ResponseEntity.status(404)
        .body(new ApiError("NOT_FOUND", "Không tìm thấy nội dung.", Map.of()));
  }

  @ExceptionHandler(DataAccessException.class)
  public ResponseEntity<ApiError> unavailable(DataAccessException exception) {
    return ResponseEntity.status(503)
        .body(new ApiError("SERVICE_UNAVAILABLE", "Dịch vụ tạm thời gián đoạn.", Map.of()));
  }
}
