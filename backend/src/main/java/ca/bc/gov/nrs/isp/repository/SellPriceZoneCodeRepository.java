package ca.bc.gov.nrs.isp.repository;

import static ca.bc.gov.nrs.isp.repository.OracleDates.localDate;
import static ca.bc.gov.nrs.isp.repository.OracleDates.timestamp;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@Profile("oracle")
public class SellPriceZoneCodeRepository {

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public SellPriceZoneCodeRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<IspSellPriceZoneCode> findAll() {
    return jdbcTemplate.query(
        "SELECT ISP_SELL_PRICE_ZONE_CODE, DESCRIPTION, EFFECTIVE_DATE, EXPIRY_DATE, UPDATE_TIMESTAMP "
            + "FROM ISP_SELL_PRICE_ZONE_CODE ORDER BY ISP_SELL_PRICE_ZONE_CODE",
        (rs, rowNum) ->
            new IspSellPriceZoneCode(
                rs.getString("ISP_SELL_PRICE_ZONE_CODE"),
                rs.getString("DESCRIPTION"),
                localDate(rs, "EFFECTIVE_DATE"),
                localDate(rs, "EXPIRY_DATE"),
                timestamp(rs, "UPDATE_TIMESTAMP")));
  }
}
