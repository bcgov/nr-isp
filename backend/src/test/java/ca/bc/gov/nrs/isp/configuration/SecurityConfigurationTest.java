package ca.bc.gov.nrs.isp.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.isp.security.IspRoles;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

/**
 * Request rules ported from the CGI rebuild (bcgov-c/nr-isp). {@link #passesSecurity()} accepts
 * whatever the handler answered (404 for an endpoint not ported yet, 503 without Oracle, 400 for an
 * empty body); a 401 or 403 means a rule refused the request.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigurationTest {

  @Autowired private MockMvc mvc;

  private static JwtRequestPostProcessor user(String... roles) {
    return jwt()
        .jwt(token -> token.claim("idir_username", "JSMITH").claim("identity_provider", "idir"))
        .authorities(
            Arrays.stream(roles)
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(role))
                .toList());
  }

  private static ResultMatcher passesSecurity() {
    return result -> assertThat(result.getResponse().getStatus()).isNotIn(401, 403);
  }

  private static JwtRequestPostProcessor admin() {
    return user(IspRoles.ISP_ADMIN);
  }

  private static JwtRequestPostProcessor approver() {
    return user(IspRoles.ISP_APPROVER);
  }

  @Test
  void statusAndProbesArePublic() throws Exception {
    mvc.perform(get("/api/status")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk());
    mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk());
  }

  @Test
  void apiRequiresAToken() throws Exception {
    mvc.perform(get("/api/session/me")).andExpect(status().isUnauthorized());
    mvc.perform(get("/api/mills")).andExpect(status().isUnauthorized());
  }

  @Test
  void sessionDescribesTheSignedInUser() throws Exception {
    mvc.perform(get("/api/session/me").with(approver()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.username").value("JSMITH"))
        .andExpect(jsonPath("$.roles", contains(IspRoles.ISP_APPROVER)));
  }

  @Test
  void usersWithoutAnIspRoleOnlyReachTheirSession() throws Exception {
    mvc.perform(get("/api/session/me").with(user()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.roles", empty()));
    mvc.perform(get("/api/mills").with(user())).andExpect(status().isForbidden());
    mvc.perform(post("/api/R10").with(user())).andExpect(status().isForbidden());
  }

  @Test
  void approversReadReportAndApproveButDoNotMaintain() throws Exception {
    mvc.perform(get("/api/mills").with(approver())).andExpect(passesSecurity());
    mvc.perform(post("/api/R10").with(approver())).andExpect(passesSecurity());
    mvc.perform(post("/api/R13").with(approver())).andExpect(passesSecurity());
    mvc.perform(patch("/api/sales-summary/approval").with(approver()))
        .andExpect(passesSecurity());
    mvc.perform(patch("/api/sales-summary/mill-report-approval").with(approver()))
        .andExpect(passesSecurity());

    mvc.perform(post("/api/mills").with(approver())).andExpect(status().isForbidden());
    mvc.perform(put("/api/mills/1").with(approver())).andExpect(status().isForbidden());
    mvc.perform(patch("/api/sales-summary/other").with(approver())).andExpect(status().isForbidden());
    mvc.perform(delete("/api/mills/1").with(approver())).andExpect(status().isForbidden());
  }

  @Test
  void administratorsMaintainReferenceData() throws Exception {
    mvc.perform(post("/api/mills").with(admin())).andExpect(passesSecurity());
    mvc.perform(put("/api/mills/1").with(admin())).andExpect(passesSecurity());
    mvc.perform(delete("/api/mills/1").with(admin())).andExpect(passesSecurity());
  }

  @Test
  void internalEndpointsAreAdministratorOnly() throws Exception {
    mvc.perform(get("/api/internal/cache").with(approver())).andExpect(status().isForbidden());
    mvc.perform(post("/api/internal/cache/evict").with(approver())).andExpect(status().isForbidden());
    mvc.perform(get("/api/internal/cache").with(admin())).andExpect(passesSecurity());
  }

  @Test
  void pathsOutsideTheApiAreDenied() throws Exception {
    mvc.perform(get("/").with(admin())).andExpect(status().isForbidden());
    mvc.perform(get("/actuator/env").with(admin())).andExpect(status().isForbidden());
  }
}
