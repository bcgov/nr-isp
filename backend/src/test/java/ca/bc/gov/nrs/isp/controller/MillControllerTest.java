package ca.bc.gov.nrs.isp.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.isp.dto.Mill;
import ca.bc.gov.nrs.isp.dto.NewMill;
import ca.bc.gov.nrs.isp.exception.ValidationConstraintViolationException;
import ca.bc.gov.nrs.isp.security.IspRoles;
import ca.bc.gov.nrs.isp.service.MillService;
import ca.bc.gov.nrs.isp.service.MillService.SavedMill;
import java.sql.SQLIntegrityConstraintViolationException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Request and response handling for {@code /api/mills}; SecurityConfigurationTest covers roles. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MillControllerTest {

  private static final String VALID_MILL =
      """
      {"millNumber": 100, "millName": "Test Mill", "ispSellPriceZoneCode": "01",
       "clientNumber": "00012345", "clientLocnCode": "01", "effectiveDate": "2020-01-01",
       "expiryDate": "9999-12-31", "comments": "Comment"}
      """;

  private static final Mill MILL =
      new Mill(
          1, 100, "Test Mill", "01", "00012345", "01", LocalDate.of(2020, 1, 1),
          LocalDate.of(9999, 12, 31), "Comment", 1, "JSMITH",
          OffsetDateTime.of(2024, 3, 4, 10, 0, 0, 0, ZoneOffset.ofHours(-8)), "JSMITH",
          OffsetDateTime.of(2024, 3, 4, 10, 0, 0, 0, ZoneOffset.ofHours(-8)));

  @Autowired private MockMvc mvc;

  @MockitoBean private MillService millService;

  private static JwtRequestPostProcessor admin() {
    return jwt()
        .jwt(token -> token.claim("idir_username", "JSMITH").claim("identity_provider", "idir"))
        .authorities(new SimpleGrantedAuthority(IspRoles.ISP_ADMIN));
  }

  @Test
  void listsMillsWithIsoDates() throws Exception {
    when(millService.getMills()).thenReturn(List.of(MILL));

    mvc.perform(get("/api/mills").with(admin()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].millId").value(1))
        .andExpect(jsonPath("$[0].millNumber").value(100))
        .andExpect(jsonPath("$[0].millName").value("Test Mill"))
        .andExpect(jsonPath("$[0].ispSellPriceZoneCode").value("01"))
        .andExpect(jsonPath("$[0].clientNumber").value("00012345"))
        .andExpect(jsonPath("$[0].clientLocnCode").value("01"))
        .andExpect(jsonPath("$[0].effectiveDate").value("2020-01-01"))
        .andExpect(jsonPath("$[0].expiryDate").value("9999-12-31"))
        .andExpect(jsonPath("$[0].comments").value("Comment"))
        .andExpect(jsonPath("$[0].revisionCount").value(1))
        .andExpect(jsonPath("$[0].entryUserid").value("JSMITH"))
        .andExpect(jsonPath("$[0].updateUserid").value("JSMITH"))
        .andExpect(jsonPath("$[0].updateTimestamp").value("2024-03-04T10:00:00-08:00"));
  }

  @Test
  void createsAMillAsTheSignedInUser() throws Exception {
    NewMill expected =
        new NewMill(
            100L, "Test Mill", "01", "00012345", "01", LocalDate.of(2020, 1, 1),
            LocalDate.of(9999, 12, 31), "Comment");
    when(millService.saveMill(expected, "JSMITH")).thenReturn(new SavedMill(MILL, true));

    mvc.perform(
            post("/api/mills").with(admin()).contentType(MediaType.APPLICATION_JSON).content(VALID_MILL))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.millId").value(1));
  }

  @Test
  void answersOkWhenTheMillNumberAlreadyExisted() throws Exception {
    when(millService.saveMill(any(), anyString())).thenReturn(new SavedMill(MILL, false));

    mvc.perform(
            post("/api/mills").with(admin()).contentType(MediaType.APPLICATION_JSON).content(VALID_MILL))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.millNumber").value(100));
  }

  @Test
  void rejectsAnIncompleteMillWithTheFieldErrors() throws Exception {
    mvc.perform(
            post("/api/mills")
                .with(admin())
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"millNumber": 100, "millName": " ", "clientNumber": "123456789",
                     "clientLocnCode": "01", "effectiveDate": "2020-01-01"}
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
        .andExpect(
            content()
                .string("clientNumber: size must be between 0 and 8; millName: must not be blank"));
    verify(millService, never()).saveMill(any(), anyString());
  }

  @Test
  void rejectsAnUnreadableBody() throws Exception {
    mvc.perform(
            post("/api/mills")
                .with(admin())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"millNumber\": \"not a number\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(
            content().string("Invalid request body: the submitted data could not be parsed."));
  }

  @Test
  void returnsBusinessRuleMessagesAsPlainText() throws Exception {
    when(millService.saveMill(any(), anyString()))
        .thenThrow(
            new ValidationConstraintViolationException(
                "Invalid Client Location Code: 01 for Client Number 00012345 does not exist."));

    mvc.perform(
            post("/api/mills").with(admin()).contentType(MediaType.APPLICATION_JSON).content(VALID_MILL))
        .andExpect(status().isBadRequest())
        .andExpect(
            content()
                .string(
                    "Invalid Client Location Code: 01 for Client Number 00012345 does not exist."));
  }

  @Test
  void returnsTheDatabaseReasonWhenAConstraintRefusesTheChange() throws Exception {
    when(millService.deleteMill(1))
        .thenThrow(
            new DataIntegrityViolationException(
                "PreparedStatementCallback; SQL [DELETE FROM MILL]",
                new SQLIntegrityConstraintViolationException(
                    "ORA-02292: integrity constraint (ISP.MR_MILL_FK) violated - child record found\n")));

    mvc.perform(delete("/api/mills/1").with(admin()))
        .andExpect(status().isBadRequest())
        .andExpect(
            content()
                .string(
                    "ORA-02292: integrity constraint (ISP.MR_MILL_FK) violated - child record found"));
  }

  @Test
  void refusesAWriteWithoutAnIdirUsername() throws Exception {
    mvc.perform(
            post("/api/mills")
                .with(
                    jwt()
                        .jwt(token -> token.claim("identity_provider", "idir"))
                        .authorities(new SimpleGrantedAuthority(IspRoles.ISP_ADMIN)))
                .contentType(MediaType.APPLICATION_JSON)
                .content(VALID_MILL))
        .andExpect(status().isUnauthorized());
    verify(millService, never()).saveMill(any(), anyString());
  }

  @Test
  void deletesAMill() throws Exception {
    when(millService.deleteMill(1)).thenReturn(true);

    mvc.perform(delete("/api/mills/1").with(admin())).andExpect(status().isNoContent());
  }

  @Test
  void answersNotFoundForAMissingMill() throws Exception {
    when(millService.deleteMill(999)).thenReturn(false);

    mvc.perform(delete("/api/mills/999").with(admin())).andExpect(status().isNotFound());
  }

  @Test
  void exportsCsvAsAnAttachment() throws Exception {
    byte[] csv = "Mill Number\n100\n".getBytes();
    when(millService.exportMillsAsCsv()).thenReturn(csv);

    mvc.perform(get("/api/mills/export/csv").with(admin()).accept(MediaType.APPLICATION_JSON))
        .andExpect(status().isOk())
        .andExpect(content().contentType("text/csv"))
        .andExpect(header().string("Content-Disposition", "attachment; filename=\"mills.csv\""))
        .andExpect(content().bytes(csv));
  }

  @Test
  void exportsPdfAsAnAttachment() throws Exception {
    byte[] pdf = "%PDF-1.4".getBytes();
    when(millService.exportMillsAsPdf()).thenReturn(pdf);

    mvc.perform(get("/api/mills/export/pdf").with(admin()))
        .andExpect(status().isOk())
        .andExpect(content().contentType(MediaType.APPLICATION_PDF))
        .andExpect(header().string("Content-Disposition", "attachment; filename=\"mills.pdf\""))
        .andExpect(content().bytes(pdf));
  }
}
