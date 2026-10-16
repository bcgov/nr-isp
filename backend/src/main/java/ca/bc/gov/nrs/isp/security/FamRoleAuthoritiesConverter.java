package ca.bc.gov.nrs.isp.security;

import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Maps the FAM client roles in a BC Gov SSO access token to ISP authorities. Only the known
 * {@link IspRoles} are granted; FAM metadata roles and anything else grant nothing.
 */
public class FamRoleAuthoritiesConverter implements Converter<Jwt, Collection<GrantedAuthority>> {

  private final String clientId;

  public FamRoleAuthoritiesConverter(String clientId) {
    this.clientId = clientId;
  }

  @Override
  public Collection<GrantedAuthority> convert(Jwt jwt) {
    return clientRoles(jwt).stream()
        .filter(IspRoles.ALL::contains)
        .distinct()
        .map(role -> (GrantedAuthority) new SimpleGrantedAuthority(role))
        .toList();
  }

  /**
   * BC Gov SSO flattens client roles into {@code client_roles}; fall back to Keycloak's standard
   * {@code resource_access} claim for the ISP client.
   */
  List<String> clientRoles(Jwt jwt) {
    List<String> roles = stringRoles(jwt.getClaim("client_roles"));
    if (!roles.isEmpty()) {
      return roles;
    }
    Object resourceAccess = jwt.getClaim("resource_access");
    if (resourceAccess instanceof Map<?, ?> byClient
        && byClient.get(clientId) instanceof Map<?, ?> client) {
      return stringRoles(client.get("roles"));
    }
    return List.of();
  }

  private static List<String> stringRoles(Object claim) {
    // Case and padding are normalized so a role's spelling cannot change what it grants.
    return claim instanceof List<?> values
        ? values.stream()
            .filter(String.class::isInstance)
            .map(value -> ((String) value).trim().toUpperCase(Locale.ROOT))
            .filter(role -> !role.isEmpty())
            .toList()
        : List.of();
  }
}
