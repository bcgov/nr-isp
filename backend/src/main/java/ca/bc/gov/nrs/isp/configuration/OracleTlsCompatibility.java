package ca.bc.gov.nrs.isp.configuration;

import java.security.Security;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * After the listener hands off a TCPS connection, the shared Oracle database only accepts
 * TLS_RSA_WITH_AES_256_CBC_SHA. Java 21.0.12 disables TLS_RSA_* by default, so re-enable those
 * suites until the database supports ECDHE; all other Java defaults stay in place.
 *
 * <p>{@code jdk.tls.disabledAlgorithms} is JVM-wide: Java cannot re-enable a suite for one
 * connection only, so every TLS client in the process may now offer TLS_RSA_* suites, including the
 * SSO signing-key fetches. They are offered after the ECDHE suites, so a modern server such as BC
 * Gov SSO still picks ECDHE or TLS 1.3. TLS 1.2+ handshake integrity also stops an attacker forcing
 * the RSA suites. Remove this once ISP's Oracle database negotiates ECDHE (shared with nr-lexis).
 */
public final class OracleTlsCompatibility {

  static final String DISABLED_ALGORITHMS = "jdk.tls.disabledAlgorithms";
  static final String RSA_KEY_EXCHANGE = "TLS_RSA_*";

  private OracleTlsCompatibility() {}

  /** Call before the first TLS connection; Java reads this property once. */
  public static void allowRsaKeyExchange() {
    String disabledAlgorithms = Security.getProperty(DISABLED_ALGORITHMS);
    if (disabledAlgorithms != null) {
      Security.setProperty(DISABLED_ALGORITHMS, withoutRsaKeyExchange(disabledAlgorithms));
    }
  }

  static String withoutRsaKeyExchange(String disabledAlgorithms) {
    return Arrays.stream(disabledAlgorithms.split(","))
        .map(String::trim)
        .filter(algorithm -> !algorithm.equals(RSA_KEY_EXCHANGE))
        .collect(Collectors.joining(", "));
  }
}
