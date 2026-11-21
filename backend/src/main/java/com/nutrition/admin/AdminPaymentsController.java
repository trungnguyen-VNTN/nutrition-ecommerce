package com.nutrition.admin;

import com.nutrition.payments.PaymentService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Admin payment log (D30): every VNPAY IPN and how the shop answered it. Read-only. */
@RestController
@RequestMapping("/api/admin/payments")
@Validated
public class AdminPaymentsController {
  private final PaymentService payments;

  public AdminPaymentsController(PaymentService payments) {
    this.payments = payments;
  }

  @GetMapping("/events")
  public Map<String, Object> events(
      @RequestParam(required = false)
          @Pattern(
              regexp =
                  "PAID|PAYMENT_FAILED|REFUND_NEEDED|DUPLICATE|INVALID_SIGNATURE|UNKNOWN_ORDER"
                      + "|INVALID_AMOUNT|DISABLED")
          String outcome,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
    return payments.events(outcome, page, size);
  }
}
