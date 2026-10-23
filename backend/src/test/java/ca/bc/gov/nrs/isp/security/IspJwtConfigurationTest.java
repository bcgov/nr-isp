package ca.bc.gov.nrs.isp.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ca.bc.gov.nrs.isp.configuration.IspAuthProperties;
import org.junit.jupiter.api.Test;

class IspJwtConfigurationTest {

  private final IspJwtConfiguration configuration = new IspJwtConfiguration();

  @Test
  void requiresTheIssuer() {
    assertThatThrownBy(() -> configuration.jwtDecoder(new IspAuthProperties("", null, "isp")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("isp.auth.oidc.issuer-uri");
    assertThatThrownBy(() -> configuration.jwtDecoder(new IspAuthProperties("/relative", null, "isp")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("absolute");
  }

  @Test
  void requiresTheClientId() {
    assertThatThrownBy(
            () ->
                configuration.jwtDecoder(
                    new IspAuthProperties("https://sso.example.test/realms/standard", null, " ")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("isp.auth.oidc.client-id");
  }

  @Test
  void buildsADecoderFromTheIssuer() {
    assertThat(
            configuration.jwtDecoder(
                new IspAuthProperties("https://sso.example.test/realms/standard/", null, "isp")))
        .isNotNull();
  }

  @Test
  void normalizesTrailingSlashes() {
    assertThat(IspJwtConfiguration.normalizeIssuerUri(" https://sso.example.test/realms/standard// "))
        .isEqualTo("https://sso.example.test/realms/standard");
  }
}
