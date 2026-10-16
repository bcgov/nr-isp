package ca.bc.gov.nrs.isp;

import ca.bc.gov.nrs.isp.configuration.OracleTlsCompatibility;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class IspApiApplication {

  public static void main(String[] args) {
    OracleTlsCompatibility.allowRsaKeyExchange();
    SpringApplication.run(IspApiApplication.class, args);
  }
}
