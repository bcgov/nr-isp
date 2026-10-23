package ca.bc.gov.nrs.isp.security;

import ca.bc.gov.nrs.isp.configuration.IspAuthProperties;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jose.util.DefaultResourceRetriever;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jwt.proc.JWTProcessor;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.util.StringUtils;

/**
 * JWT decoding and authority mapping for interactive users. Startup fails unless the SSO issuer
 * and ISP client ID are configured, so the API never runs unsecured.
 */
@Configuration(proxyBeanMethods = false)
public class IspJwtConfiguration {

  private static final int JWKS_CONNECT_TIMEOUT_MILLIS = (int) Duration.ofSeconds(10).toMillis();
  private static final int JWKS_READ_TIMEOUT_MILLIS = (int) Duration.ofSeconds(15).toMillis();
  private static final int JWKS_SIZE_LIMIT_BYTES = 50 * 1024;

  @Bean
  JwtDecoder jwtDecoder(IspAuthProperties properties) {
    String issuerUri = requireAbsoluteUri(normalizeIssuerUri(properties.issuerUri()), "isp.auth.oidc.issuer-uri");
    String clientId = requireClientId(properties.clientId());
    String jwkSetUri =
        requireAbsoluteUri(
            StringUtils.hasText(properties.jwkSetUri())
                ? properties.jwkSetUri()
                : issuerUri + "/protocol/openid-connect/certs",
            "isp.auth.oidc.jwk-set-uri");

    NimbusJwtDecoder decoder = new NimbusJwtDecoder(jwtProcessor(jwkSetUri));
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<Jwt>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            new IspAccessTokenValidator(clientId)));
    return decoder;
  }

  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter(IspAuthProperties properties) {
    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        new FamRoleAuthoritiesConverter(requireClientId(properties.clientId())));
    return converter;
  }

  /**
   * Spring's JWK-set decoder caches keys for five minutes, then refetches them on a request thread
   * with no timeout or retry, so a slow SSO response at that moment fails the request with a 401.
   * As in nr-lexis, keys are refreshed before they expire, a failed fetch is retried once and each
   * fetch is time-bounded. Otherwise this matches Spring's processor: RS256 signatures, with the
   * claims left to the token validators.
   */
  private static JWTProcessor<SecurityContext> jwtProcessor(String jwkSetUri) {
    URL jwkSetUrl;
    try {
      jwkSetUrl = URI.create(jwkSetUri).toURL();
    } catch (IllegalArgumentException | MalformedURLException exception) {
      throw new IllegalStateException("isp.auth.oidc.jwk-set-uri must be a valid URL", exception);
    }
    JWKSource<SecurityContext> jwkSource =
        JWKSourceBuilder.create(
                jwkSetUrl,
                new DefaultResourceRetriever(
                    JWKS_CONNECT_TIMEOUT_MILLIS, JWKS_READ_TIMEOUT_MILLIS, JWKS_SIZE_LIMIT_BYTES))
            .retrying(true)
            .refreshAheadCache(true)
            .build();
    DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
    processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwkSource));
    processor.setJWTClaimsSetVerifier((claims, context) -> {});
    return processor;
  }

  static String normalizeIssuerUri(String issuerUri) {
    return issuerUri == null ? null : issuerUri.trim().replaceAll("/+$", "");
  }

  private static String requireClientId(String clientId) {
    if (!StringUtils.hasText(clientId)) {
      throw new IllegalStateException("isp.auth.oidc.client-id must be configured");
    }
    return clientId.trim();
  }

  private static String requireAbsoluteUri(String value, String propertyName) {
    if (!StringUtils.hasText(value)) {
      throw new IllegalStateException(propertyName + " must be configured");
    }
    URI uri;
    try {
      uri = URI.create(value.trim());
    } catch (IllegalArgumentException exception) {
      throw new IllegalStateException(propertyName + " must be a valid absolute URI", exception);
    }
    if (!uri.isAbsolute()) {
      throw new IllegalStateException(propertyName + " must be an absolute URI");
    }
    return value.trim();
  }
}
