package com.nutrition.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * General API rate limit (phase 7), fixed one-minute windows kept in memory.
 *
 * <p>Signed-in requests are counted per Cognito {@code sub}; anonymous ones per client IP. The
 * filter runs after Spring Security, so the identity comes only from a validated JWT (invariant 1).
 * Counters live in this task only: with one task (D20) that is the whole limit; more tasks would
 * each allow the same amount. The AI chat keeps its own daily quota on top of this.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  enum Bucket {
    READ,
    WRITE,
    ORDER,
    UPLOAD
  }

  private record Window(long minute, int count) {}

  private static final int MAX_KEYS = 10_000;
  private static final String BODY =
      "{\"code\":\"RATE_LIMITED\",\"message\":\"Có quá nhiều yêu cầu. Vui lòng thử lại sau.\",\"details\":{}}";

  private final Map<String, Window> windows = new ConcurrentHashMap<>();
  private final Map<Bucket, Integer> limits;
  private final int forwardedHops;
  private final Clock clock;

  @Autowired
  public RateLimitFilter(
      @Value("${nutrition.rate-limit.read-per-minute:300}") int read,
      @Value("${nutrition.rate-limit.write-per-minute:60}") int write,
      @Value("${nutrition.rate-limit.orders-per-minute:10}") int orders,
      @Value("${nutrition.rate-limit.uploads-per-minute:30}") int uploads,
      @Value("${nutrition.rate-limit.forwarded-hops:0}") int forwardedHops) {
    this(read, write, orders, uploads, forwardedHops, Clock.systemUTC());
  }

  RateLimitFilter(int read, int write, int orders, int uploads, int forwardedHops, Clock clock) {
    this.limits =
        Map.of(
            Bucket.READ, read, Bucket.WRITE, write, Bucket.ORDER, orders, Bucket.UPLOAD, uploads);
    this.forwardedHops = forwardedHops;
    this.clock = clock;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    // Health checks from the ALB and static paths are never limited.
    return !request.getRequestURI().startsWith("/api/");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Bucket bucket = bucket(request);
    String key = bucket + ":" + caller(request);
    long now = clock.millis();
    long minute = now / 60_000;
    if (windows.size() > MAX_KEYS) windows.values().removeIf(w -> w.minute() < minute);
    Window window =
        windows.compute(
            key,
            (k, old) ->
                old == null || old.minute() != minute
                    ? new Window(minute, 1)
                    : new Window(minute, old.count() + 1));
    if (window.count() > limits.get(bucket)) {
      long retryAfter = Math.max(1, ((minute + 1) * 60_000 - now + 999) / 1000);
      response.setStatus(429);
      response.setHeader("Retry-After", Long.toString(retryAfter));
      response.setContentType("application/json;charset=UTF-8");
      response.getWriter().write(BODY);
      return;
    }
    chain.doFilter(request, response);
  }

  static Bucket bucket(HttpServletRequest request) {
    String method = request.getMethod();
    String path = request.getRequestURI();
    if ("GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method))
      return Bucket.READ;
    if ("POST".equals(method) && "/api/orders".equals(path)) return Bucket.ORDER;
    if ("POST".equals(method) && path.matches("/api/admin/products/\\d+/images"))
      return Bucket.UPLOAD;
    return Bucket.WRITE;
  }

  private String caller(HttpServletRequest request) {
    var authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt)
      return "user:" + jwt.getSubject();
    return "ip:" + clientIp(request);
  }

  /**
   * On AWS the request passes CloudFront and then the ALB, and each appends the address it saw to
   * X-Forwarded-For. With {@code forwarded-hops=2} the viewer is the second entry from the right;
   * anything further left was sent by the client and is not trusted. Locally (0 hops) the socket
   * address is used.
   */
  String clientIp(HttpServletRequest request) {
    String forwarded = request.getHeader("X-Forwarded-For");
    if (forwardedHops > 0 && forwarded != null) {
      String[] parts = forwarded.split(",");
      int index = parts.length - forwardedHops;
      if (index >= 0) return parts[index].trim();
    }
    return request.getRemoteAddr();
  }
}
