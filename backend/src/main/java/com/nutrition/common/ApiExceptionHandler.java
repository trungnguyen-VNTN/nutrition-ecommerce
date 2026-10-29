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

  @ExceptionHandler({
    ConstraintViolationException.class,
    MethodArgumentTypeMismatchException.class,
    IllegalArgumentException.class
  })
  public ResponseEntity<ApiError> invalid(Exception exception) {
    return ResponseEntity.badRequest()
        .body(new ApiError("INVALID_REQUEST", "Tham số không hợp lệ.", Map.of()));
  }

  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<ApiError> missing(NoSuchElementException exception) {
    return ResponseEntity.status(404)
        .body(new ApiError("NOT_FOUND", "Không tìm thấy sản phẩm.", Map.of()));
  }

  @ExceptionHandler(DataAccessException.class)
  public ResponseEntity<ApiError> unavailable(DataAccessException exception) {
    return ResponseEntity.status(503)
        .body(new ApiError("SERVICE_UNAVAILABLE", "Dịch vụ tạm thời gián đoạn.", Map.of()));
  }
}
