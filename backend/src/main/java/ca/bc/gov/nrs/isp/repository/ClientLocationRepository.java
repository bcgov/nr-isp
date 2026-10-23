package ca.bc.gov.nrs.isp.repository;

import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Forest Client locations, read through the {@code CLIENT_LOCATION} synonym. */
@Repository
@Profile("oracle")
public class ClientLocationRepository {

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public ClientLocationRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public boolean exists(String clientNumber, String clientLocnCode) {
    Integer count =
        jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM CLIENT_LOCATION "
                + "WHERE CLIENT_NUMBER = :clientNumber AND CLIENT_LOCN_CODE = :clientLocnCode",
            Map.of("clientNumber", clientNumber, "clientLocnCode", clientLocnCode),
            Integer.class);
    return count != null && count > 0;
  }
}
