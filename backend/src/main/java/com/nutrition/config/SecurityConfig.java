package com.nutrition.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  public static OAuth2TokenValidator<Jwt> cognitoValidator(String issuer, String clientId) {
    OAuth2TokenValidator<Jwt> claims =
        jwt -> {
          boolean valid;
          try {
            UUID.fromString(jwt.getSubject());
            valid =
                "access".equals(jwt.getClaimAsString("token_use"))
                    && clientId.equals(jwt.getClaimAsString("client_id"))
                    && jwt.getExpiresAt() != null;
          } catch (RuntimeException exception) {
            valid = false;
          }
          return valid
              ? OAuth2TokenValidatorResult.success()
              : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
    return new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefaultWithIssuer(issuer), claims);
  }

  @Bean
  JwtDecoder jwtDecoder(
      @Value("${COGNITO_ISSUER_URI:}") String issuer,
      @Value("${COGNITO_CLIENT_ID:}") String clientId,
      org.springframework.core.env.Environment environment) {
    if (java.util.Arrays.asList(environment.getActiveProfiles()).contains("production")
        && (issuer.isBlank() || clientId.isBlank()))
      throw new IllegalArgumentException("Production requires Cognito issuer and client ID");
    // Missing configuration never enables a local authentication bypass.
    if (issuer.isBlank() || clientId.isBlank())
      return token -> {
        throw new BadJwtException("Authentication unavailable");
      };
    if (!issuer.startsWith("https://cognito-idp.ap-southeast-1.amazonaws.com/"))
      throw new IllegalArgumentException("Expected a Singapore Cognito issuer");
    var decoder = NimbusJwtDecoder.withJwkSetUri(issuer + "/.well-known/jwks.json").build();
    decoder.setJwtValidator(cognitoValidator(issuer, clientId));
    return decoder;
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http, ObjectMapper mapper) throws Exception {
    var converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt -> {
          List<String> groups = jwt.getClaimAsStringList("cognito:groups");
          return groups == null
              ? List.of()
              : groups.stream()
                  .filter(group -> group.equals("ADMIN") || group.equals("USER"))
                  .<org.springframework.security.core.GrantedAuthority>map(
                      group -> new SimpleGrantedAuthority("ROLE_" + group))
                  .toList();
        });
    return http.csrf(csrf -> csrf.disable())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        HttpMethod.GET,
                        "/actuator/health",
                        "/api/products",
                        "/api/products/*",
                        "/api/categories")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers("/api/**")
                    .authenticated()
                    .anyRequest()
                    .denyAll())
        .oauth2ResourceServer(
            oauth ->
                oauth
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(converter))
                    .authenticationEntryPoint(
                        (request, response, error) -> {
                          response.setStatus(401);
                          response.setContentType("application/json");
                          mapper.writeValue(
                              response.getOutputStream(),
                              Map.of(
                                  "code",
                                  "UNAUTHORIZED",
                                  "message",
                                  "Vui lòng đăng nhập lại.",
                                  "details",
                                  Map.of()));
                        }))
        .exceptionHandling(
            errors ->
                errors.accessDeniedHandler(
                    (request, response, error) -> {
                      response.setStatus(403);
                      response.setContentType("application/json");
                      mapper.writeValue(
                          response.getOutputStream(),
                          Map.of(
                              "code",
                              "FORBIDDEN",
                              "message",
                              "Không có quyền truy cập.",
                              "details",
                              Map.of()));
                    }))
        .build();
  }
}
