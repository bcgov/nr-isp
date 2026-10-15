package ca.bc.gov.nrs.isp.repository;

import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;

/**
 * A private in-memory H2 database in Oracle mode with {@code db/isp-schema.sql}, so repository
 * tests run their real SQL. H2 is not Oracle: keep the SQL to what both accept.
 */
final class OracleModeDatabase implements AutoCloseable {

  private final SingleConnectionDataSource dataSource;
  final NamedParameterJdbcTemplate jdbc;

  OracleModeDatabase() {
    dataSource =
        new SingleConnectionDataSource(
            "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=Oracle;DEFAULT_NULL_ORDERING=HIGH", true);
    new ResourceDatabasePopulator(new ClassPathResource("db/isp-schema.sql")).execute(dataSource);
    jdbc = new NamedParameterJdbcTemplate(dataSource);
  }

  @Override
  public void close() {
    dataSource.destroy();
  }
}
