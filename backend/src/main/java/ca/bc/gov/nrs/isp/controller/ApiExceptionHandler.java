package ca.bc.gov.nrs.isp.controller;

import ca.bc.gov.nrs.isp.exception.ValidationConstraintViolationException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Turns rejected input into a 400 with a plain-text message the page can show as-is. Other
 * failures keep Spring Boot's JSON error body, which never includes the exception message.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<String> invalidArgument(MethodArgumentNotValidException exception) {
    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .sorted()
            .collect(Collectors.joining("; "));
    log.warn("Validation failed: {}", message);
    return badRequest(message);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<String> unreadableBody(HttpMessageNotReadableException exception) {
    log.warn("Unreadable request body: {}", exception.getMessage());
    return badRequest("Invalid request body: the submitted data could not be parsed.");
  }

  @ExceptionHandler(ValidationConstraintViolationException.class)
  public ResponseEntity<String> businessRule(ValidationConstraintViolationException exception) {
    log.warn("Validation constraint violation: {}", exception.getMessage());
    return badRequest(exception.getMessage());
  }

  /**
   * A database constraint refused the change, for example deleting a mill that has reports. The
   * Oracle message names the constraint that refused it.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<String> dataIntegrity(DataIntegrityViolationException exception) {
    String message = NestedExceptionUtils.getMostSpecificCause(exception).getMessage();
    log.warn("Data integrity violation: {}", message);
    return badRequest(message == null ? "Data integrity violation." : message.strip());
  }

  private static ResponseEntity<String> badRequest(String message) {
    return ResponseEntity.badRequest().contentType(MediaType.TEXT_PLAIN).body(message);
  }
}
