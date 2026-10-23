package ca.bc.gov.nrs.isp.controller;

import static ca.bc.gov.nrs.isp.controller.OracleServices.require;

import ca.bc.gov.nrs.isp.dto.Mill;
import ca.bc.gov.nrs.isp.dto.NewMill;
import ca.bc.gov.nrs.isp.security.IspUser;
import ca.bc.gov.nrs.isp.service.MillService;
import ca.bc.gov.nrs.isp.service.MillService.SavedMill;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Mill names maintenance: list, create or update, delete and export mills. */
@RestController
@RequestMapping("/mills")
public class MillController {

  private static final MediaType TEXT_CSV = MediaType.parseMediaType("text/csv");

  private final ObjectProvider<MillService> millService;

  public MillController(ObjectProvider<MillService> millService) {
    this.millService = millService;
  }

  @GetMapping
  public List<Mill> getMills() {
    return require(millService).getMills();
  }

  /** Creates the mill (201) or updates the one with the same mill number (200). */
  @PostMapping
  public ResponseEntity<Mill> saveMill(
      @Valid @RequestBody NewMill newMill, JwtAuthenticationToken authentication) {
    String username = IspUser.from(authentication).requiredUsername();
    SavedMill saved = require(millService).saveMill(newMill, username);
    return ResponseEntity.status(saved.created() ? HttpStatus.CREATED : HttpStatus.OK)
        .body(saved.mill());
  }

  @DeleteMapping("/{millId}")
  public ResponseEntity<Void> deleteMill(
      @PathVariable long millId, JwtAuthenticationToken authentication) {
    String username = IspUser.from(authentication).requiredUsername();
    return require(millService).deleteMill(millId, username)
        ? ResponseEntity.noContent().build()
        : ResponseEntity.notFound().build();
  }

  @GetMapping("/export/csv")
  public ResponseEntity<byte[]> exportMillsAsCsv() {
    return attachment(require(millService).exportMillsAsCsv(), "mills.csv", TEXT_CSV);
  }

  @GetMapping("/export/pdf")
  public ResponseEntity<byte[]> exportMillsAsPdf() {
    return attachment(
        require(millService).exportMillsAsPdf(), "mills.pdf", MediaType.APPLICATION_PDF);
  }

  private static ResponseEntity<byte[]> attachment(
      byte[] body, String filename, MediaType mediaType) {
    return ResponseEntity.ok()
        .contentType(mediaType)
        .header(
            "Content-Disposition",
            ContentDisposition.attachment().filename(filename).build().toString())
        .body(body);
  }
}
