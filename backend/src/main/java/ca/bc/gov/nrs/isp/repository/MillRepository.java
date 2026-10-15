package ca.bc.gov.nrs.isp.repository;

import static ca.bc.gov.nrs.isp.repository.OracleDates.localDate;
import static ca.bc.gov.nrs.isp.repository.OracleDates.timestamp;

import ca.bc.gov.nrs.isp.dto.Mill;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** The {@code MILL} table. The {@code MILL_B_I_U} trigger writes {@code MILL_AUDIT}. */
@Repository
@Profile("oracle")
public class MillRepository {

  private static final String COLUMNS =
      "MILL_ID, MILL_NUMBER, MILL_NAME, ISP_SELL_PRICE_ZONE_CODE, CLIENT_NUMBER, CLIENT_LOCN_CODE, "
          + "EFFECTIVE_DATE, EXPIRY_DATE, COMMENTS, REVISION_COUNT, ENTRY_USERID, ENTRY_TIMESTAMP, "
          + "UPDATE_USERID, UPDATE_TIMESTAMP";

  private final NamedParameterJdbcTemplate jdbcTemplate;

  public MillRepository(NamedParameterJdbcTemplate jdbcTemplate) {
    this.jdbcTemplate = jdbcTemplate;
  }

  public List<Mill> findAll() {
    return jdbcTemplate.query(
        "SELECT " + COLUMNS + " FROM MILL ORDER BY MILL_NAME, MILL_NUMBER", MillRepository::mapRow);
  }

  public Optional<Mill> findByMillNumber(long millNumber) {
    return jdbcTemplate
        .query(
            "SELECT " + COLUMNS + " FROM MILL WHERE MILL_NUMBER = :millNumber",
            Map.of("millNumber", millNumber),
            MillRepository::mapRow)
        .stream()
        .findFirst();
  }

  public long nextMillId() {
    return jdbcTemplate.queryForObject("SELECT MILL_SEQ.NEXTVAL FROM DUAL", Map.of(), Long.class);
  }

  /** Inserts a mill at revision 1 with both audit timestamps set to now. */
  public void insert(Mill mill) {
    jdbcTemplate.update(
        "INSERT INTO MILL ("
            + COLUMNS
            + ") VALUES (:millId, :millNumber, :millName, :ispSellPriceZoneCode, :clientNumber, "
            + ":clientLocnCode, :effectiveDate, :expiryDate, :comments, 1, :userId, "
            + "CURRENT_TIMESTAMP, :userId, CURRENT_TIMESTAMP)",
        parameters(mill));
  }

  /** Updates every column except the entry audit columns and increments the revision count. */
  public int update(Mill mill) {
    return jdbcTemplate.update(
        "UPDATE MILL SET MILL_NUMBER = :millNumber, MILL_NAME = :millName, "
            + "ISP_SELL_PRICE_ZONE_CODE = :ispSellPriceZoneCode, CLIENT_NUMBER = :clientNumber, "
            + "CLIENT_LOCN_CODE = :clientLocnCode, EFFECTIVE_DATE = :effectiveDate, "
            + "EXPIRY_DATE = :expiryDate, COMMENTS = :comments, "
            + "REVISION_COUNT = REVISION_COUNT + 1, UPDATE_USERID = :userId, "
            + "UPDATE_TIMESTAMP = CURRENT_TIMESTAMP WHERE MILL_ID = :millId",
        parameters(mill));
  }

  public int deleteById(long millId) {
    return jdbcTemplate.update("DELETE FROM MILL WHERE MILL_ID = :millId", Map.of("millId", millId));
  }

  private static MapSqlParameterSource parameters(Mill mill) {
    return new MapSqlParameterSource()
        .addValue("millId", mill.millId())
        .addValue("millNumber", mill.millNumber())
        .addValue("millName", mill.millName())
        .addValue("ispSellPriceZoneCode", mill.ispSellPriceZoneCode())
        .addValue("clientNumber", mill.clientNumber())
        .addValue("clientLocnCode", mill.clientLocnCode())
        .addValue("effectiveDate", mill.effectiveDate())
        .addValue("expiryDate", mill.expiryDate())
        .addValue("comments", mill.comments())
        .addValue("userId", mill.updateUserid());
  }

  private static Mill mapRow(ResultSet rs, int rowNum) throws SQLException {
    return new Mill(
        rs.getLong("MILL_ID"),
        rs.getLong("MILL_NUMBER"),
        rs.getString("MILL_NAME"),
        rs.getString("ISP_SELL_PRICE_ZONE_CODE"),
        rs.getString("CLIENT_NUMBER"),
        rs.getString("CLIENT_LOCN_CODE"),
        localDate(rs, "EFFECTIVE_DATE"),
        localDate(rs, "EXPIRY_DATE"),
        rs.getString("COMMENTS"),
        rs.getInt("REVISION_COUNT"),
        rs.getString("ENTRY_USERID"),
        timestamp(rs, "ENTRY_TIMESTAMP"),
        rs.getString("UPDATE_USERID"),
        timestamp(rs, "UPDATE_TIMESTAMP"));
  }
}
