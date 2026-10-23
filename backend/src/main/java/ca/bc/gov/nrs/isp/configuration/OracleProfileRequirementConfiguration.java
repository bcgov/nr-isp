package ca.bc.gov.nrs.isp.configuration;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Prevents a deployed backend from silently starting without its Oracle datasource. */
@Configuration(proxyBeanMethods = false)
@Profile("!oracle")
@ConditionalOnProperty(name = "isp.runtime.require-oracle-profile", havingValue = "true")
public class OracleProfileRequirementConfiguration {

  @Bean
  SmartInitializingSingleton missingOracleProfileGuard() {
    return () -> {
      throw new IllegalStateException(
          "The oracle Spring profile is required for this deployed ISP runtime.");
    };
  }
}
