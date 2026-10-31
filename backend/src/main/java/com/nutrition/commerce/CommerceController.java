package com.nutrition.commerce;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Validated
public class CommerceController {
  private final CommerceService service;

  public CommerceController(CommerceService service) {
    this.service = service;
  }

  public record AddItem(@Positive long productId, @Min(1) @Max(99) int quantity) {}

  public record Quantity(@Min(1) @Max(99) int quantity) {}

  public record Shipping(
      @NotBlank @Size(max = 120) String shippingName,
      @NotBlank @Size(max = 30) String phone,
      @NotBlank @Size(max = 500) String address) {}

  private UUID user(Jwt jwt) {
    return UUID.fromString(jwt.getSubject());
  }

  @GetMapping("/me")
  public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) {
    service.cart(user(jwt));
    List<String> groups = jwt.getClaimAsStringList("cognito:groups");
    return Map.of("sub", jwt.getSubject(), "groups", groups == null ? List.of() : groups);
  }

  @GetMapping("/cart")
  public CommerceService.Cart cart(@AuthenticationPrincipal Jwt jwt) {
    return service.cart(user(jwt));
  }

  @PostMapping("/cart/items")
  public CommerceService.Cart add(
      @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AddItem item) {
    service.put(user(jwt), item.productId, item.quantity, true);
    return service.cart(user(jwt));
  }

  @PatchMapping("/cart/items/{id}")
  public CommerceService.Cart update(
      @AuthenticationPrincipal Jwt jwt,
      @Positive @PathVariable long id,
      @Valid @RequestBody Quantity item) {
    service.put(user(jwt), id, item.quantity, false);
    return service.cart(user(jwt));
  }

  @DeleteMapping("/cart/items/{id}")
  public CommerceService.Cart remove(
      @AuthenticationPrincipal Jwt jwt, @Positive @PathVariable long id) {
    service.remove(user(jwt), id);
    return service.cart(user(jwt));
  }

  @PostMapping("/orders")
  public Map<String, Object> checkout(
      @AuthenticationPrincipal Jwt jwt,
      @RequestHeader("Idempotency-Key") UUID key,
      @Valid @RequestBody Shipping shipping) {
    long id =
        service.checkout(user(jwt), key, shipping.shippingName, shipping.phone, shipping.address);
    return service.order(user(jwt), id);
  }

  @GetMapping("/orders")
  public List<Map<String, Object>> orders(
      @AuthenticationPrincipal Jwt jwt,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
    return service.orders(user(jwt), page, size);
  }

  @GetMapping("/orders/{id}")
  public Map<String, Object> order(
      @AuthenticationPrincipal Jwt jwt, @Positive @PathVariable long id) {
    return service.order(user(jwt), id);
  }

  @PostMapping("/orders/{id}/cancel")
  public Map<String, Object> cancel(
      @AuthenticationPrincipal Jwt jwt, @Positive @PathVariable long id) {
    service.cancel(user(jwt), id);
    return service.order(user(jwt), id);
  }
}
