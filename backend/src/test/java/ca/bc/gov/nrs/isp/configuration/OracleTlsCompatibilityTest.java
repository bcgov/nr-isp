package ca.bc.gov.nrs.isp.configuration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OracleTlsCompatibilityTest {

  @Test
  void removesOnlyTheRsaKeyExchangeEntry() {
    assertThat(OracleTlsCompatibility.withoutRsaKeyExchange("SSLv3, TLS_RSA_*, RC4, DES"))
        .isEqualTo("SSLv3, RC4, DES");
  }

  @Test
  void leavesOtherSettingsUnchanged() {
    assertThat(OracleTlsCompatibility.withoutRsaKeyExchange("SSLv3, RC4")).isEqualTo("SSLv3, RC4");
  }
}
