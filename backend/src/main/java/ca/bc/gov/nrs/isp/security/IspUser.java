package ca.bc.gov.nrs.isp.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.util.StringUtils;

/**
 * The signed-in ISP user.
 *
 * @param username IDIR username, the value the CGI rebuild writes to {@code entry_userid} and
 *     {@code update_userid}
 * @param roles granted {@link IspRoles}
 */
public record IspUser(
    String username,
    String displayName,
    String email,
    String identityProvider,
    List<String> roles) {

  public static IspUser from(Jwt jwt, Collection<? extends GrantedAuthority> authorities) {
    return new IspUser(
        claim(jwt, "idir_username"),
        claim(jwt, "display_name"),
        claim(jwt, "email"),
        claim(jwt, "identity_provider"),
        authorities.stream()
            .map(GrantedAuthority::getAuthority)
            .filter(IspRoles.ALL::contains)
            .toList());
  }

  public static IspUser from(JwtAuthenticationToken authentication) {
    return from(authentication.getToken(), authentication.getAuthorities());
  }

  /**
   * The IDIR username for audit columns. A write without one is refused rather than recorded
   * against nobody.
   */
  public String requiredUsername() {
    if (username == null) {
      throw new AuthenticationCredentialsNotFoundException(
          "The access token has no IDIR username to record against this change.");
    }
    return username;
  }

  private static String claim(Jwt jwt, String name) {
    String value = jwt.getClaimAsString(name);
    return StringUtils.hasText(value) ? value.trim() : null;
  }
}
