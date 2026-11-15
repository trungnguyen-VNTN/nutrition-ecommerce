package com.nutrition.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class RateLimitFilterTest {
  private Instant now = Instant.parse("2026-11-13T10:00:10Z");
  private final Clock clock =
      new Clock() {
        @Override
        public Instant instant() {
          return now;
        }

        @Override
        public java.time.ZoneId getZone() {
          return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
          return this;
        }
      };

  // read 2, write 2, orders 1, uploads 1, CloudFront + ALB in front.
  private final RateLimitFilter filter = new RateLimitFilter(2, 2, 1, 1, 2, clock);
  private final AtomicInteger passed = new AtomicInteger();

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  private MockHttpServletResponse send(String method, String path, String forwardedFor)
      throws Exception {
    var request = new MockHttpServletRequest(method, path);
    request.setRemoteAddr("10.0.0.5"); // the ALB
    if (forwardedFor != null) request.addHeader("X-Forwarded-For", forwardedFor);
    var response = new MockHttpServletResponse();
    filter.doFilter(
        request,
        response,
        new MockFilterChain() {
          @Override
          public void doFilter(
              jakarta.servlet.ServletRequest req, jakarta.servlet.ServletResponse res) {
            passed.incrementAndGet();
          }
        });
    return response;
  }

  @Test
  void limitsAnonymousReadsPerViewerIpAndResetsNextMinute() throws Exception {
    String viewer = "203.0.113.7, 130.176.1.1";
    assertThat(send("GET", "/api/products", viewer).getStatus()).isEqualTo(200);
    assertThat(send("GET", "/api/products", viewer).getStatus()).isEqualTo(200);
    MockHttpServletResponse limited = send("GET", "/api/products", viewer);
    assertThat(limited.getStatus()).isEqualTo(429);
    assertThat(limited.getHeader("Retry-After")).isEqualTo("50");
    assertThat(limited.getContentAsString()).contains("RATE_LIMITED");
    assertThat(passed.get()).isEqualTo(2);
    // Another viewer behind the same CloudFront edge is not affected.
    assertThat(send("GET", "/api/products", "198.51.100.9, 130.176.1.1").getStatus())
        .isEqualTo(200);
    now = now.plusSeconds(60);
    assertThat(send("GET", "/api/products", viewer).getStatus()).isEqualTo(200);
  }

  @Test
  void spoofedForwardedForEntriesDoNotCreateNewBuckets() throws Exception {
    // The client may prepend anything; only the entry CloudFront added counts.
    for (int i = 0; i < 2; i++)
      send("GET", "/api/products", "1.1.1." + i + ", 203.0.113.7, 130.176.1.1");
    assertThat(send("GET", "/api/products", "9.9.9.9, 203.0.113.7, 130.176.1.1").getStatus())
        .isEqualTo(429);
  }

  @Test
  void signedInUsersAreCountedBySubAndOrdersHaveTheirOwnLimit() throws Exception {
    Jwt jwt = Jwt.withTokenValue("t").header("alg", "none").subject("user-a").claim("x", 1).build();
    SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
    assertThat(send("POST", "/api/orders", "203.0.113.7, 130.176.1.1").getStatus()).isEqualTo(200);
    // A different IP does not reset the limit of the same account.
    assertThat(send("POST", "/api/orders", "198.51.100.9, 130.176.1.1").getStatus()).isEqualTo(429);
    assertThat(send("POST", "/api/cart/items", null).getStatus()).isEqualTo(200);
    assertThat(send("POST", "/api/admin/products/4/images", null).getStatus()).isEqualTo(200);
    assertThat(send("POST", "/api/admin/products/4/images", null).getStatus()).isEqualTo(429);
  }

  @Test
  void healthChecksAreNeverLimited() throws Exception {
    for (int i = 0; i < 10; i++)
      assertThat(send("GET", "/actuator/health", null).getStatus()).isEqualTo(200);
  }
}
