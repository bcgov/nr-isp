package ca.bc.gov.nrs.isp.configuration;

import java.sql.SQLException;
import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * The {@code oracle} profile re-enables Spring Boot's DataSource, JdbcTemplate and
 * NamedParameterJdbcTemplate auto-configuration (see application-oracle.yml).
 */
@Configuration
@Profile("oracle")
public class OracleDataSourceConfiguration {

  @Bean
  public InitializingBean warmOraclePool(DataSource dataSource) {
    return () -> {
      try (var ignored = dataSource.getConnection()) {
        // Force pool initialization on startup for fail-fast behavior.
      } catch (SQLException ex) {
        throw new IllegalStateException("Failed to validate Oracle DataSource at startup", ex);
      }
    };
  }
}
