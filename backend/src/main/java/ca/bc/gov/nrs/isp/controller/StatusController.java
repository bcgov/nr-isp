package ca.bc.gov.nrs.isp.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public liveness check used by the frontend's API status badge, as in the CGI rebuild. */
@RestController
public class StatusController {

  @GetMapping("/status")
  public Map<String, String> status() {
    return Map.of("status", "UP");
  }
}
