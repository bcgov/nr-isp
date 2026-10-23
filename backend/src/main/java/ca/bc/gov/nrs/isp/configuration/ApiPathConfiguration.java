package ca.bc.gov.nrs.isp.configuration;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.HandlerTypePredicate;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves every REST controller under {@value #API_BASE_PATH}, as the CGI rebuild's
 * ApiBasePathConfig did, so ported controllers keep their mappings (for example {@code /status} and
 * {@code /R10}). Caddy proxies {@code /api*} to this backend unchanged. Actuator endpoints are not
 * REST controllers and stay at {@code /actuator}.
 */
@Configuration
public class ApiPathConfiguration implements WebMvcConfigurer {

  public static final String API_BASE_PATH = "/api";

  @Override
  public void configurePathMatch(PathMatchConfigurer configurer) {
    configurer.addPathPrefix(
        API_BASE_PATH, HandlerTypePredicate.forAnnotation(RestController.class));
  }
}
