package com.nutrition.admin;

import com.nutrition.commerce.CommerceService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/orders")
@Validated
public class AdminOrdersController {
  private final CommerceService service;

  public AdminOrdersController(CommerceService service) {
    this.service = service;
  }

  public record Transition(
      @NotBlank @Pattern(regexp = "CONFIRMED|SHIPPED|DELIVERED|CANCELLED") String status) {}

  @GetMapping
  public List<Map<String, Object>> list(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
    return service.adminOrders(page, size);
  }

  @GetMapping("/{id}")
  public Map<String, Object> detail(@PathVariable @Positive long id) {
    return service.adminOrder(id);
  }

  @PatchMapping("/{id}/status")
  public Map<String, Long> transition(
      @PathVariable @Positive long id, @Valid @RequestBody Transition transition) {
    service.transition(id, transition.status);
    return Map.of("id", id);
  }
}
