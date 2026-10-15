package ca.bc.gov.nrs.isp.repository;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;

/**
 * Reads Oracle {@code DATE} columns, which hold B.C. wall-clock time with no zone. Timestamps take
 * the JVM's zone ({@code TZ=America/Vancouver} when deployed), the zone the database writes them
 * in. The CGI rebuild labelled the same wall-clock values UTC.
 */
final class OracleDates {

  private OracleDates() {}

  static LocalDate localDate(ResultSet rs, String column) throws SQLException {
    Date value = rs.getDate(column);
    return value == null ? null : value.toLocalDate();
  }

  static OffsetDateTime timestamp(ResultSet rs, String column) throws SQLException {
    Timestamp value = rs.getTimestamp(column);
    return value == null ? null : OffsetDateTime.ofInstant(value.toInstant(), ZoneId.systemDefault());
  }
}
