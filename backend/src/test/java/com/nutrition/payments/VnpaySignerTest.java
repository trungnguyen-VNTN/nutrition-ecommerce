package com.nutrition.payments;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;

class VnpaySignerTest {
  private final VnpaySigner signer = new VnpaySigner("TESTSECRET");

  @Test
  void canonicalStringIsSortedEncodedAndSkipsEmptyValuesAndTheHash() {
    Map<String, String> params = new LinkedHashMap<>();
    params.put("vnp_OrderInfo", "Thanh toan don hang 12");
    params.put("vnp_Amount", "6900000");
    params.put("vnp_BankCode", "");
    params.put("vnp_ReturnUrl", "https://x.cloudfront.net/payment/vnpay-return");
    params.put("vnp_SecureHash", "ignored");
    assertThat(VnpaySigner.canonical(params))
        .isEqualTo(
            "vnp_Amount=6900000&vnp_OrderInfo=Thanh+toan+don+hang+12"
                + "&vnp_ReturnUrl=https%3A%2F%2Fx.cloudfront.net%2Fpayment%2Fvnpay-return");
  }

  @Test
  void signatureIsHmacSha512OfTheCanonicalString() throws Exception {
    Map<String, String> params = Map.of("vnp_Amount", "100", "vnp_TxnRef", "1NABC");
    Mac mac = Mac.getInstance("HmacSHA512");
    mac.init(new SecretKeySpec("TESTSECRET".getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
    String expected =
        HexFormat.of()
            .formatHex(
                mac.doFinal("vnp_Amount=100&vnp_TxnRef=1NABC".getBytes(StandardCharsets.US_ASCII)));
    assertThat(signer.sign(params)).isEqualTo(expected).hasSize(128);
  }

  @Test
  void verifyAcceptsOnlyAnUntouchedCallback() {
    Map<String, String> params = new HashMap<>();
    params.put("vnp_Amount", "6900000");
    params.put("vnp_TxnRef", "12NABCDEFGH");
    params.put("vnp_ResponseCode", "00");
    params.put("vnp_SecureHash", signer.sign(params).toUpperCase());
    params.put("vnp_SecureHashType", "HmacSHA512");
    assertThat(signer.verify(params)).isTrue();

    params.put("vnp_Amount", "100");
    assertThat(signer.verify(params)).isFalse();
    params.remove("vnp_SecureHash");
    assertThat(signer.verify(params)).isFalse();
    assertThat(new VnpaySigner("OTHER").verify(Map.of("vnp_SecureHash", "abc"))).isFalse();
  }

  @Test
  void amountsAreSentInHundredths() {
    assertThat(PaymentService.toVnpayAmount(new java.math.BigDecimal("69000.00")))
        .isEqualTo("6900000");
  }
}
