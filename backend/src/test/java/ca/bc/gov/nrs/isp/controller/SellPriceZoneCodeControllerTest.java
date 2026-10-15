package ca.bc.gov.nrs.isp.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import ca.bc.gov.nrs.isp.security.IspRoles;
import ca.bc.gov.nrs.isp.service.SellPriceZoneCodeService;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SellPriceZoneCodeControllerTest {

  @Autowired private MockMvc mvc;

  @MockitoBean private SellPriceZoneCodeService sellPriceZoneCodeService;

  @Test
  void listsSellPriceZones() throws Exception {
    when(sellPriceZoneCodeService.getSellPriceZoneCodes())
        .thenReturn(
            List.of(
                new IspSellPriceZoneCode(
                    "01", "Coast", LocalDate.of(2000, 1, 1), LocalDate.of(9999, 12, 31),
                    OffsetDateTime.of(2024, 5, 6, 7, 8, 9, 0, ZoneOffset.ofHours(-7)))));

    mvc.perform(
            get("/api/isp-sell-price-zone-codes")
                .with(jwt().authorities(new SimpleGrantedAuthority(IspRoles.ISP_APPROVER))))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].ispSellPriceZoneCode").value("01"))
        .andExpect(jsonPath("$[0].description").value("Coast"))
        .andExpect(jsonPath("$[0].effectiveDate").value("2000-01-01"))
        .andExpect(jsonPath("$[0].expiryDate").value("9999-12-31"))
        .andExpect(jsonPath("$[0].updateTimestamp").value("2024-05-06T07:08:09-07:00"));
  }
}
