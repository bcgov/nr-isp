package ca.bc.gov.nrs.isp.controller;

import ca.bc.gov.nrs.isp.security.IspUser;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in user and their ISP roles. The frontend shows navigation from this response; the
 * backend's request rules remain the security boundary.
 */
@RestController
@RequestMapping("/session")
public class SessionController {

  @GetMapping("/me")
  public IspUser me(JwtAuthenticationToken authentication) {
    return IspUser.from(authentication.getToken(), authentication.getAuthorities());
  }
}
