package ca.bc.gov.nrs.isp.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Interactive sign-in through BC Gov SSO (Keycloak standard realm), with roles granted in FAM.
 *
 * @param issuerUri SSO realm issuer, for example {@code https://loginproxy.gov.bc.ca/auth/realms/standard}
 * @param jwkSetUri optional signing-key endpoint; defaults to the issuer's Keycloak certs endpoint
 * @param clientId the ISP browser client; access tokens must name it in {@code azp}
 */
@ConfigurationProperties("isp.auth.oidc")
public record IspAuthProperties(String issuerUri, String jwkSetUri, String clientId) {}
