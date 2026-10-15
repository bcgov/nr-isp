package ca.bc.gov.nrs.isp.exception;

/**
 * A business rule rejected the request. {@code ApiExceptionHandler} returns the message as a 400,
 * for the page to show as-is, as the CGI rebuild did.
 */
public class ValidationConstraintViolationException extends RuntimeException {

  public ValidationConstraintViolationException(String message) {
    super(message);
  }
}
