package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;

import com.nutrition.config.SecurityConfig;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class JwtValidationTest {
  @Test
  void signedTokensMustMatchTrustedRsaKey() throws Exception {
    var generator = java.security.KeyPairGenerator.getInstance("RSA");
    generator.initialize(2048);
    var trusted = generator.generateKeyPair();
    var attacker = generator.generateKeyPair();
    var decoder =
        org.springframework.security.oauth2.jwt.NimbusJwtDecoder.withPublicKey(
                (java.security.interfaces.RSAPublicKey) trusted.getPublic())
            .build();
    decoder.setJwtValidator(
        SecurityConfig.cognitoValidator("https://issuer.example/pool", "spa-client"));
    var claims =
        new com.nimbusds.jwt.JWTClaimsSet.Builder()
            .subject(UUID.randomUUID().toString())
            .issuer("https://issuer.example/pool")
            .expirationTime(java.util.Date.from(Instant.now().plusSeconds(300)))
            .claim("token_use", "access")
            .claim("client_id", "spa-client")
            .build();
    var valid =
        new com.nimbusds.jwt.SignedJWT(
            new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.RS256), claims);
    valid.sign(new com.nimbusds.jose.crypto.RSASSASigner(trusted.getPrivate()));
    assertThat(decoder.decode(valid.serialize()).getSubject()).isEqualTo(claims.getSubject());
    var forged =
        new com.nimbusds.jwt.SignedJWT(
            new com.nimbusds.jose.JWSHeader(com.nimbusds.jose.JWSAlgorithm.RS256), claims);
    forged.sign(new com.nimbusds.jose.crypto.RSASSASigner(attacker.getPrivate()));
    org.assertj.core.api.Assertions.assertThatThrownBy(() -> decoder.decode(forged.serialize()))
        .isInstanceOf(org.springframework.security.oauth2.jwt.JwtException.class);
  }

  @Test
  void accessTokenRequiresIssuerClientSubjectAndExpiry() {
    var validator = SecurityConfig.cognitoValidator("https://issuer.example/pool", "spa-client");
    var now = Instant.now();
    var token =
        Jwt.withTokenValue("test")
            .header("alg", "RS256")
            .subject(UUID.randomUUID().toString())
            .issuer("https://issuer.example/pool")
            .issuedAt(now)
            .expiresAt(now.plusSeconds(300))
            .claim("token_use", "access")
            .claim("client_id", "spa-client");
    assertThat(validator.validate(token.build()).hasErrors()).isFalse();
    assertThat(validator.validate(token.claim("token_use", "id").build()).hasErrors()).isTrue();
    assertThat(
            validator
                .validate(token.claim("token_use", "access").claim("client_id", "other").build())
                .hasErrors())
        .isTrue();
    assertThat(
            validator
                .validate(
                    token
                        .claim("client_id", "spa-client")
                        .expiresAt(now.minusSeconds(120))
                        .issuedAt(now.minusSeconds(500))
                        .build())
                .hasErrors())
        .isTrue();
    assertThat(
            validator
                .validate(
                    token.expiresAt(now.plusSeconds(300)).issuer("https://other.example").build())
                .hasErrors())
        .isTrue();
  }
}
