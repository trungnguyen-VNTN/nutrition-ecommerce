package com.nutrition.payments;

import com.nutrition.common.RateLimitFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
public class PaymentController {
  private final PaymentService payments;
  private final RateLimitFilter clientIp;

  public PaymentController(PaymentService payments, RateLimitFilter clientIp) {
    this.payments = payments;
    this.clientIp = clientIp;
  }

  /** Payment methods offered at checkout; VNPAY only when it is configured. */
  @GetMapping("/api/payments/methods")
  public List<String> methods() {
    return payments.methods();
  }

  @PostMapping("/api/orders/{id}/payments/vnpay")
  public Map<String, String> vnpay(
      @AuthenticationPrincipal Jwt jwt,
      @Positive @PathVariable long id,
      HttpServletRequest request) {
    return Map.of(
        "payment_url",
        payments.createVnpayUrl(UUID.fromString(jwt.getSubject()), id, clientIp.clientIp(request)));
  }

  /** Server-to-server notification from VNPAY; the only place a payment becomes PAID. */
  @GetMapping("/api/payments/vnpay/ipn")
  public Map<String, String> ipn(@RequestParam Map<String, String> params) {
    var response = payments.handleIpn(params);
    return Map.of("RspCode", response.rspCode(), "Message", response.message());
  }

  /** Read-only result for the page VNPAY redirects the shopper to. No personal data is returned. */
  @GetMapping("/api/payments/vnpay/return")
  public PaymentService.ReturnResult vnpayReturn(@RequestParam Map<String, String> params) {
    return payments.returnResult(params);
  }
}
