package ca.bc.gov.nrs.isp.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.isp.security.IspRoles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** Without the oracle profile there are no business services, so their endpoints answer 503. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DatabaseUnavailableTest {

  @Autowired private MockMvc mvc;

  @Test
  void businessEndpointsAreUnavailableWithoutOracle() throws Exception {
    var approver = jwt().authorities(new SimpleGrantedAuthority(IspRoles.ISP_APPROVER));

    mvc.perform(get("/api/mills").with(approver)).andExpect(status().isServiceUnavailable());
    mvc.perform(get("/api/isp-sell-price-zone-codes").with(approver))
        .andExpect(status().isServiceUnavailable());
  }
}
