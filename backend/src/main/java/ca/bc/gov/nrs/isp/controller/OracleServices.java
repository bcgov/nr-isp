package ca.bc.gov.nrs.isp.controller;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * Business services and repositories exist only with the {@code oracle} profile, as in nr-lexis.
 * Without it the API still starts, for the security tests and frontend work, and endpoints that
 * need the database answer 503. Controllers take an {@link ObjectProvider} for each service.
 */
final class OracleServices {

  private OracleServices() {}

  static <T> T require(ObjectProvider<T> service) {
    return service.getIfAvailable(
        () -> {
          throw new ResponseStatusException(
              HttpStatus.SERVICE_UNAVAILABLE, "The ISP database is not configured.");
        });
  }
}
