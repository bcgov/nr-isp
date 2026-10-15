package ca.bc.gov.nrs.isp.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

class FamRoleAuthoritiesConverterTest {

  private final FamRoleAuthoritiesConverter converter = new FamRoleAuthoritiesConverter("isp-client");

  private static Jwt.Builder token() {
    return Jwt.withTokenValue("token").header("alg", "RS256").subject("user");
  }

  private List<String> authorities(Jwt jwt) {
    return converter.convert(jwt).stream().map(GrantedAuthority::getAuthority).toList();
  }

  @Test
  void grantsKnownFamClientRoles() {
    Jwt jwt = token().claim("client_roles", List.of("ISP_ADMIN", "ISP_APPROVER")).build();

    assertThat(authorities(jwt)).containsExactly("ISP_ADMIN", "ISP_APPROVER");
  }

  @Test
  void normalizesCaseAndPaddingAndDropsDuplicates() {
    Jwt jwt = token().claim("client_roles", List.of(" isp_approver ", "ISP_APPROVER")).build();

    assertThat(authorities(jwt)).containsExactly("ISP_APPROVER");
  }

  @Test
  void ignoresUnknownAndMetadataRoles() {
    Jwt jwt =
        token().claim("client_roles", List.of("FAM:ADMIN", "ISP_ADMIN_EXTRA", "LEXIS_ADMIN", 42)).build();

    assertThat(authorities(jwt)).isEmpty();
  }

  @Test
  void fallsBackToResourceAccessForTheIspClient() {
    Jwt jwt =
        token()
            .claim(
                "resource_access",
                Map.of(
                    "isp-client", Map.of("roles", List.of("ISP_ADMIN")),
                    "other-client", Map.of("roles", List.of("ISP_APPROVER"))))
            .build();

    assertThat(authorities(jwt)).containsExactly("ISP_ADMIN");
  }

  @Test
  void grantsNothingWithoutRoles() {
    assertThat(authorities(token().build())).isEmpty();
  }
}
