package ca.bc.gov.nrs.isp.security;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Sends real bearer tokens through the resource-server filter chain. Only signature checking is
 * replaced, so this proves the chain uses the FAM role converter rather than Spring's default
 * scope-based one.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BearerTokenRoleMappingTest {

  @Autowired private MockMvc mvc;

  @MockitoBean private JwtDecoder jwtDecoder;

  private void tokenWithClientRoles(String... roles) {
    Jwt jwt =
        Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .subject("user")
            .claim("idir_username", "JSMITH")
            .claim("identity_provider", "idir")
            .claim("scope", "openid profile email")
            .claim("client_roles", List.of(roles))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(300))
            .build();
    given(jwtDecoder.decode(anyString())).willReturn(jwt);
  }

  private static String bearer() {
    return "Bearer token";
  }

  @Test
  void fam_client_roles_become_isp_authorities() throws Exception {
    tokenWithClientRoles("ISP_APPROVER");

    mvc.perform(get("/api/session/me").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("JSMITH"))
        .andExpect(jsonPath("$.roles", contains(IspRoles.ISP_APPROVER)));
    mvc.perform(get("/api/mills").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isNotFound());
  }

  @Test
  void scopes_and_unknown_roles_grant_nothing() throws Exception {
    tokenWithClientRoles("ISP_ADMIN_EXTRA");

    mvc.perform(get("/api/session/me").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles", empty()));
    mvc.perform(get("/api/mills").header(HttpHeaders.AUTHORIZATION, bearer()))
        .andExpect(status().isForbidden());
  }
}
