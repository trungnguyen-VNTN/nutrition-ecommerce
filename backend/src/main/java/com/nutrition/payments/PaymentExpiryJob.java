package com.nutrition.payments;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Returns the stock held by unpaid VNPAY orders. The job waits a grace period after the payment
 * window VNPAY enforces (vnp_ExpireDate), so a payment completed at the last second still lands.
 */
@Component
@ConditionalOnProperty(
    name = "nutrition.vnpay.expiry-job",
    havingValue = "true",
    matchIfMissing = true)
public class PaymentExpiryJob {
  private final PaymentService payments;
  private final int graceMinutes;

  public PaymentExpiryJob(
      PaymentService payments,
      @Value("${nutrition.vnpay.expiry-grace-minutes:5}") int graceMinutes) {
    this.payments = payments;
    this.graceMinutes = graceMinutes;
  }

  @Scheduled(fixedDelayString = "${nutrition.vnpay.expiry-check-ms:60000}", initialDelay = 30000)
  public void run() {
    payments.expireUnpaid(graceMinutes);
  }
}
