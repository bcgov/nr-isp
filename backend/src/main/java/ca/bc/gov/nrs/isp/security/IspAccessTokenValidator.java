package ca.bc.gov.nrs.isp.security;

import java.util.Set;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Accepts only ISP browser-client access tokens for IDIR staff. Signature, issuer and expiry are
 * checked separately by the decoder's default validators.
 */
public class IspAccessTokenValidator implements OAuth2TokenValidator<Jwt> {

  /** BC Gov SSO reports IDIR sign-ins as {@code idir} or, through Entra ID, {@code azureidir}. */
  static final Set<String> STAFF_IDENTITY_PROVIDERS = Set.of("idir", "azureidir");

  private static final OAuth2Error INVALID_TOKEN =
      new OAuth2Error("invalid_token", "An ISP user access token is required.", null);

  private final String expectedClientId;

  public IspAccessTokenValidator(String expectedClientId) {
    this.expectedClientId = expectedClientId;
  }

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    if (!expectedClientId.equals(token.getClaimAsString("azp"))
        // Keycloak's payload typ distinguishes access tokens from ID and refresh tokens.
        || !"Bearer".equals(token.getClaimAsString("typ"))
        || token.getExpiresAt() == null
        || !isStaffIdentityProvider(token.getClaimAsString("identity_provider"))) {
      return OAuth2TokenValidatorResult.failure(INVALID_TOKEN);
    }
    return OAuth2TokenValidatorResult.success();
  }

  static boolean isStaffIdentityProvider(String identityProvider) {
    return identityProvider != null && STAFF_IDENTITY_PROVIDERS.contains(identityProvider);
  }
}
