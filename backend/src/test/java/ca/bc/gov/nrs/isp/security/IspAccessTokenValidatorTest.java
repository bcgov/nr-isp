package ca.bc.gov.nrs.isp.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

class IspAccessTokenValidatorTest {

  private final IspAccessTokenValidator validator = new IspAccessTokenValidator("isp-client");

  private static Jwt.Builder accessToken() {
    return Jwt.withTokenValue("token")
        .header("alg", "RS256")
        .claim("azp", "isp-client")
        .claim("typ", "Bearer")
        .claim("identity_provider", "azureidir")
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(300));
  }

  @Test
  void acceptsAnIdirAccessTokenForTheIspClient() {
    assertThat(validator.validate(accessToken().build()).hasErrors()).isFalse();
    assertThat(validator.validate(accessToken().claim("identity_provider", "idir").build()).hasErrors())
        .isFalse();
  }

  @Test
  void rejectsAnotherClientsToken() {
    assertThat(validator.validate(accessToken().claim("azp", "lexis").build()).hasErrors()).isTrue();
  }

  @Test
  void rejectsIdAndRefreshTokens() {
    assertThat(validator.validate(accessToken().claim("typ", "ID").build()).hasErrors()).isTrue();
    assertThat(validator.validate(accessToken().claim("typ", "Refresh").build()).hasErrors()).isTrue();
  }

  @Test
  void rejectsNonStaffIdentityProviders() {
    assertThat(validator.validate(accessToken().claim("identity_provider", "bceidbusiness").build()).hasErrors())
        .isTrue();
    assertThat(
            validator
                .validate(
                    Jwt.withTokenValue("token")
                        .header("alg", "RS256")
                        .claim("azp", "isp-client")
                        .claim("typ", "Bearer")
                        .expiresAt(Instant.now().plusSeconds(300))
                        .build())
                .hasErrors())
        .isTrue();
  }
}
