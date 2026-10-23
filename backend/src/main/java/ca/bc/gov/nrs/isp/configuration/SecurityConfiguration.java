package ca.bc.gov.nrs.isp.configuration;

import static ca.bc.gov.nrs.isp.security.IspRoles.ISP_ADMIN;
import static ca.bc.gov.nrs.isp.security.IspRoles.ISP_APPROVER;

import jakarta.servlet.DispatcherType;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Stateless bearer-token API. The access rules carry the CGI rebuild's {@code SecurityConfig} forward:
 * Approvers read everything, generate reports and run the sales-summary approval workflow, and
 * every other write is Administrator only.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

  private static final String API = ApiPathConfiguration.API_BASE_PATH;

  @Value("${ALLOWED_ORIGINS:http://localhost:3000}")
  private String allowedOrigins;

  @Bean
  public SecurityFilterChain filterChain(
      HttpSecurity http, JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
    http
        // Bearer tokens are sent explicitly by the SPA and never as cookies, so CSRF does not apply.
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .httpBasic(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        // The SPA performs OAuth redirects; this bearer API never replays a saved login request.
        .requestCache(cache -> cache.requestCache(new NullRequestCache()))
        .cors(Customizer.withDefaults())
        // FAM client roles become ISP authorities (IspJwtConfiguration). Wired explicitly rather
        // than relying on Spring's lookup of a converter bean.
        .oauth2ResourceServer(
            oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter)));

    http.authorizeHttpRequests(
        authorize ->
            authorize
                // Keep the status Spring chose for an already-authorized request instead of
                // replacing its error dispatch with an unrelated 403.
                .dispatcherTypeMatchers(DispatcherType.ERROR)
                .permitAll()
                // Probes and metrics. The backend has no public Route; its NetworkPolicy admits
                // only the frontend and the monitoring namespace.
                .requestMatchers("/actuator/health", "/actuator/health/**", "/actuator/info")
                .permitAll()
                .requestMatchers("/actuator/prometheus")
                .permitAll()
                .requestMatchers(HttpMethod.GET, API + "/status")
                .permitAll()
                // Signed-in users without an ISP role can still learn they have no access.
                .requestMatchers(HttpMethod.GET, API + "/session/**")
                .authenticated()
                // The CGI rebuild meant this rule to be admin-only but never matched its /api prefix.
                .requestMatchers(API + "/internal/**")
                .hasAuthority(ISP_ADMIN)
                .requestMatchers(HttpMethod.GET, API + "/**")
                .hasAnyAuthority(ISP_ADMIN, ISP_APPROVER)
                .requestMatchers(
                    HttpMethod.PATCH,
                    API + "/sales-summary/approval",
                    API + "/sales-summary/mill-report-approval")
                .hasAnyAuthority(ISP_ADMIN, ISP_APPROVER)
                .requestMatchers(HttpMethod.POST, API + "/R10", API + "/R11", API + "/R12", API + "/R13")
                .hasAnyAuthority(ISP_ADMIN, ISP_APPROVER)
                .requestMatchers(HttpMethod.POST, API + "/**")
                .hasAuthority(ISP_ADMIN)
                .requestMatchers(HttpMethod.PUT, API + "/**")
                .hasAuthority(ISP_ADMIN)
                .requestMatchers(HttpMethod.PATCH, API + "/**")
                .hasAuthority(ISP_ADMIN)
                .requestMatchers(HttpMethod.DELETE, API + "/**")
                .hasAuthority(ISP_ADMIN)
                .anyRequest()
                .denyAll());

    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    List<String> origins =
        Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .toList();

    configuration.setAllowedOrigins(origins);
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
    configuration.setExposedHeaders(List.of("Content-Disposition"));
    configuration.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration(API + "/**", configuration);
    return source;
  }
}
