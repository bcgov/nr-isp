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
        .hasMessageContaining("https");
  }

  @Test
  void requiresHttpsForTheIssuerAndSigningKeys() {
    for (String issuer :
        new String[] {"http://sso.example.test/realms/standard", "file:///etc/realms/standard"}) {
      assertThatThrownBy(() -> configuration.jwtDecoder(new IspAuthProperties(issuer, null, "isp")))
          .isInstanceOf(IllegalStateException.class)
          .hasMessageContaining("isp.auth.oidc.issuer-uri must be an https URI");
    }
    assertThatThrownBy(
            () ->
                configuration.jwtDecoder(
                    new IspAuthProperties(
                        "https://sso.example.test/realms/standard",
                        "http://sso.example.test/realms/standard/protocol/openid-connect/certs",
                        "isp")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("isp.auth.oidc.jwk-set-uri must be an https URI");
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
