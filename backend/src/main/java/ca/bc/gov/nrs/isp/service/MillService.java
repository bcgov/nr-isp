package ca.bc.gov.nrs.isp.service;

import ca.bc.gov.nrs.isp.dto.Mill;
import ca.bc.gov.nrs.isp.dto.NewMill;
import ca.bc.gov.nrs.isp.exception.ValidationConstraintViolationException;
import ca.bc.gov.nrs.isp.repository.ClientLocationRepository;
import ca.bc.gov.nrs.isp.repository.MillRepository;
import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAccessor;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Mill names maintenance. Saving looks a mill up by its mill number, so one call creates or
 * updates it.
 */
@Service
@Profile("oracle")
public class MillService {

  /** Expiry given to every new mill, matching the column default. */
  static final LocalDate OPEN_EXPIRY_DATE = LocalDate.of(9999, 12, 31);

  private static final Logger log = LoggerFactory.getLogger(MillService.class);

  private static final String[] EXPORT_HEADERS = {
    "Mill Number",
    "Mill Name",
    "Zone",
    "Client Number",
    "Client Location",
    "Comments",
    "Effective Date",
    "Expiry Date",
    "Update Date",
    "Update ID"
  };

  private static final float[] PDF_COLUMN_WIDTHS = {80, 150, 100, 80, 80, 80, 80, 150, 80, 80};

  private static final DateTimeFormatter EXPORT_DATE = DateTimeFormatter.ISO_LOCAL_DATE;

  private final MillRepository millRepository;
  private final ClientLocationRepository clientLocationRepository;

  public MillService(
      MillRepository millRepository, ClientLocationRepository clientLocationRepository) {
    this.millRepository = millRepository;
    this.clientLocationRepository = clientLocationRepository;
  }

  /** The outcome of {@link #saveMill}: the stored row and whether it was inserted. */
  public record SavedMill(Mill mill, boolean created) {}

  @Transactional(readOnly = true)
  public List<Mill> getMills() {
    return millRepository.findAll();
  }

  /**
   * Creates the mill, or updates the one with the same mill number.
   *
   * @param username IDIR username for the audit columns
   */
  @Transactional
  public SavedMill saveMill(NewMill newMill, String username) {
    Mill existing = millRepository.findByMillNumber(newMill.millNumber()).orElse(null);

    // Validate the client location only when it is set or changed, so an unrelated edit still
    // saves after the existing CLIENT_LOCATION row is deactivated.
    boolean clientLocationChanged =
        existing == null
            || !Objects.equals(existing.clientNumber(), newMill.clientNumber())
            || !Objects.equals(existing.clientLocnCode(), newMill.clientLocnCode());
    if (clientLocationChanged
        && !clientLocationRepository.exists(newMill.clientNumber(), newMill.clientLocnCode())) {
      throw new ValidationConstraintViolationException(
          "Invalid Client Location Code: "
              + newMill.clientLocnCode()
              + " for Client Number "
              + newMill.clientNumber()
              + " does not exist.");
    }

    if (existing == null) {
      long millId = millRepository.nextMillId();
      millRepository.insert(toRow(millId, newMill, OPEN_EXPIRY_DATE, username));
      log.info("Created mill {} (ID {})", newMill.millNumber(), millId);
      return new SavedMill(reload(newMill), true);
    }

    LocalDate expiryDate =
        newMill.expiryDate() != null ? newMill.expiryDate() : existing.expiryDate();
    if (newMill.effectiveDate().isAfter(expiryDate)) {
      throw new ValidationConstraintViolationException(
          "Effective date cannot be after expiry date.");
    }
    millRepository.update(toRow(existing.millId(), newMill, expiryDate, username));
    log.info("Updated mill {} (ID {})", newMill.millNumber(), existing.millId());
    return new SavedMill(reload(newMill), false);
  }

  /**
   * Returns false when no mill has the ID. {@code MILL_AUDIT} records inserts and updates only,
   * so the log line is the record of who deleted a mill.
   *
   * @param username IDIR username of the user deleting the mill
   */
  @Transactional
  public boolean deleteMill(long millId, String username) {
    boolean deleted = millRepository.deleteById(millId) > 0;
    if (deleted) {
      log.info("Deleted mill ID {} for {}", millId, username);
    }
    return deleted;
  }

  @Transactional(readOnly = true)
  public byte[] exportMillsAsCsv() {
    StringBuilder csv = new StringBuilder(String.join(",", EXPORT_HEADERS)).append('\n');
    for (Mill mill : millRepository.findAll()) {
      csv.append(mill.millNumber())
          .append(',')
          .append(quoted(mill.millName()))
          .append(',')
          .append(quoted(mill.ispSellPriceZoneCode()))
          .append(',')
          .append(quoted(mill.clientNumber()))
          .append(',')
          .append(quoted(mill.clientLocnCode()))
          .append(',')
          .append(quoted(mill.comments()))
          .append(',')
          .append(formatDate(mill.effectiveDate()))
          .append(',')
          .append(formatDate(mill.expiryDate()))
          .append(',')
          .append(formatDate(mill.updateTimestamp()))
          .append(',')
          .append(quoted(mill.updateUserid()))
          .append('\n');
    }
    return csv.toString().getBytes(StandardCharsets.UTF_8);
  }

  @Transactional(readOnly = true)
  public byte[] exportMillsAsPdf() {
    ByteArrayOutputStream pdf = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4.rotate());
    PdfWriter.getInstance(document, pdf);
    document.open();
    document.add(new Paragraph("Mills Report"));

    PdfPTable table = new PdfPTable(PDF_COLUMN_WIDTHS);
    table.setWidthPercentage(100);
    table.setSpacingBefore(10);
    table.setHeaderRows(1);
    for (String header : EXPORT_HEADERS) {
      table.addCell(header);
    }
    for (Mill mill : millRepository.findAll()) {
      Stream.of(
              String.valueOf(mill.millNumber()),
              mill.millName(),
              mill.ispSellPriceZoneCode(),
              mill.clientNumber(),
              mill.clientLocnCode(),
              mill.comments(),
              formatDate(mill.effectiveDate()),
              formatDate(mill.expiryDate()),
              formatDate(mill.updateTimestamp()),
              mill.updateUserid())
          .map(value -> Objects.toString(value, ""))
          .forEach(table::addCell);
    }
    document.add(table);
    document.close();
    return pdf.toByteArray();
  }

  private Mill reload(NewMill newMill) {
    return millRepository.findByMillNumber(newMill.millNumber()).orElseThrow();
  }

  private static Mill toRow(long millId, NewMill newMill, LocalDate expiryDate, String username) {
    return new Mill(
        millId,
        newMill.millNumber(),
        newMill.millName(),
        newMill.ispSellPriceZoneCode(),
        newMill.clientNumber(),
        newMill.clientLocnCode(),
        newMill.effectiveDate(),
        expiryDate,
        newMill.comments(),
        0,
        username,
        null,
        username,
        null);
  }

  /** An RFC 4180 field: quoted, with quotes doubled, so commas and quotes stay in their column. */
  private static String quoted(String value) {
    return value == null ? "\"\"" : "\"" + value.replace("\"", "\"\"") + "\"";
  }

  private static String formatDate(TemporalAccessor date) {
    return date == null ? "" : EXPORT_DATE.format(date);
  }
}
