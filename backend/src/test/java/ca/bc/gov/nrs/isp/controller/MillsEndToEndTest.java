package ca.bc.gov.nrs.isp.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.isp.security.IspRoles;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The oracle profile's wiring, from controller to SQL, against H2 in Oracle mode: the pattern
 * each ported page follows.
 */
@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:mills-e2e;MODE=Oracle;DB_CLOSE_DELAY=-1",
      "spring.datasource.driver-class-name=org.h2.Driver",
      "spring.datasource.username=sa",
      "spring.datasource.password=",
      "KEYSTORE_SECRET=unused",
      "spring.sql.init.mode=always",
      "spring.sql.init.schema-locations=classpath:db/isp-schema.sql"
    })
@AutoConfigureMockMvc
@ActiveProfiles({"test", "oracle"})
@DirtiesContext
class MillsEndToEndTest {

  @Autowired private MockMvc mvc;
  @Autowired private JdbcTemplate jdbcTemplate;

  private static JwtRequestPostProcessor admin() {
    return jwt()
        .jwt(token -> token.claim("idir_username", "JSMITH").claim("identity_provider", "idir"))
        .authorities(new SimpleGrantedAuthority(IspRoles.ISP_ADMIN));
  }

  private static String mill(String millName) {
    return """
        {"millNumber": 4200, "millName": "%s", "clientNumber": "00012345",
         "clientLocnCode": "01", "effectiveDate": "2020-01-01", "comments": "Ported"}
        """
        .formatted(millName);
  }

  @Test
  void createsUpdatesListsAndDeletesAMill() throws Exception {
    jdbcTemplate.update("INSERT INTO CLIENT_LOCATION VALUES ('00012345', '01')");

    mvc.perform(
            post("/api/mills")
                .with(admin())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mill("Ported Mill")))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.millId").value(100))
        .andExpect(jsonPath("$.expiryDate").value("9999-12-31"))
        .andExpect(jsonPath("$.revisionCount").value(1))
        .andExpect(jsonPath("$.entryUserid").value("JSMITH"));

    mvc.perform(
            post("/api/mills")
                .with(admin())
                .contentType(MediaType.APPLICATION_JSON)
                .content(mill("Renamed Mill")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revisionCount").value(2));

    mvc.perform(get("/api/mills").with(admin()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].millName").value("Renamed Mill"))
        .andExpect(jsonPath("$[0].updateUserid").value("JSMITH"));

    mvc.perform(delete("/api/mills/100").with(admin())).andExpect(status().isNoContent());
    mvc.perform(get("/api/mills").with(admin()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$").isEmpty());
  }
}
