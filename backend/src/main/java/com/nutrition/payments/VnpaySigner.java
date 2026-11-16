package com.nutrition.payments;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * VNPAY 2.1.0 checksum (D27): parameters sorted by name, keys and values URL-encoded (US-ASCII, as
 * in VNPAY's Java sample), empty values skipped, joined with {@code &}, then HMAC-SHA512 with the
 * merchant's hash secret, lowercase hex. The secret is never logged or returned.
 */
public final class VnpaySigner {
  static final String HASH = "vnp_SecureHash";
  static final String HASH_TYPE = "vnp_SecureHashType";

  private final byte[] secret;

  public VnpaySigner(String secret) {
    this.secret = secret.getBytes(StandardCharsets.UTF_8);
  }

  /** The canonical query string that is both signed and sent. */
  static String canonical(Map<String, String> params) {
    return new TreeMap<>(params)
        .entrySet().stream()
            .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
            .filter(e -> !e.getKey().equals(HASH) && !e.getKey().equals(HASH_TYPE))
            .map(e -> encode(e.getKey()) + "=" + encode(e.getValue()))
            .collect(Collectors.joining("&"));
  }

  public String sign(Map<String, String> params) {
    try {
      Mac mac = Mac.getInstance("HmacSHA512");
      mac.init(new SecretKeySpec(secret, "HmacSHA512"));
      return HexFormat.of()
          .formatHex(mac.doFinal(canonical(params).getBytes(StandardCharsets.US_ASCII)));
    } catch (java.security.GeneralSecurityException e) {
      throw new IllegalStateException("HMAC-SHA512 unavailable", e);
    }
  }

  /** Signed query string to append to the payment URL. */
  public String signedQuery(Map<String, String> params) {
    return canonical(params) + "&" + HASH + "=" + sign(params);
  }

  /** Constant-time check of a callback's {@code vnp_SecureHash} over its other vnp_ fields. */
  public boolean verify(Map<String, String> params) {
    String given = params.get(HASH);
    if (given == null || given.isBlank()) return false;
    Map<String, String> fields = new TreeMap<>();
    params.forEach(
        (k, v) -> {
          if (k.startsWith("vnp_")) fields.put(k, v);
        });
    byte[] expected = sign(fields).getBytes(StandardCharsets.US_ASCII);
    byte[] actual = given.toLowerCase(java.util.Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
    return MessageDigest.isEqual(expected, actual);
  }

  private static String encode(String value) {
    return URLEncoder.encode(value, StandardCharsets.US_ASCII);
  }
}
