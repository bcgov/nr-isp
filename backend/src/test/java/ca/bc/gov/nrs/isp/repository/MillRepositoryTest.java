package ca.bc.gov.nrs.isp.repository;

import static java.time.temporal.ChronoUnit.MINUTES;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;

import ca.bc.gov.nrs.isp.dto.Mill;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class MillRepositoryTest {

  private static final LocalDate EFFECTIVE = LocalDate.of(2020, 1, 1);
  private static final LocalDate OPEN = LocalDate.of(9999, 12, 31);

  private OracleModeDatabase database;
  private MillRepository repository;

  @BeforeEach
  void setUp() {
    database = new OracleModeDatabase();
    database.jdbc.update(
        "INSERT INTO ISP_SELL_PRICE_ZONE_CODE VALUES "
            + "('01', 'Coast', DATE '2000-01-01', DATE '9999-12-31', CURRENT_TIMESTAMP)",
        Map.of());
    repository = new MillRepository(database.jdbc);
  }

  @AfterEach
  void tearDown() {
    database.close();
  }

  private static Mill mill(long millId, long millNumber, String millName, String username) {
    return new Mill(
        millId, millNumber, millName, null, "00012345", "01", EFFECTIVE, OPEN, "Note", 0, username,
        null, username, null);
  }

  @Test
  void insertsANewMillAtRevisionOneWithEntryAndUpdateAudit() {
    repository.insert(mill(1, 100, "Alpha Mill", "JSMITH"));

    Mill saved = repository.findByMillNumber(100).orElseThrow();

    assertThat(saved)
        .usingRecursiveComparison()
        .ignoringFields("entryTimestamp", "updateTimestamp")
        .isEqualTo(
            new Mill(
                1, 100, "Alpha Mill", null, "00012345", "01", EFFECTIVE, OPEN, "Note", 1, "JSMITH",
                null, "JSMITH", null));
    assertThat(saved.entryTimestamp()).isCloseTo(OffsetDateTime.now(), within(1, MINUTES));
    assertThat(saved.updateTimestamp()).isEqualTo(saved.entryTimestamp());
  }

  @Test
  void updatesEverythingButTheEntryAuditAndIncrementsTheRevision() {
    repository.insert(mill(1, 100, "Alpha Mill", "JSMITH"));
    Mill changed =
        new Mill(
            1, 100, "Renamed Mill", "01", "00067890", "02", LocalDate.of(2021, 2, 3),
            LocalDate.of(2030, 4, 5), null, 0, "IGNORED", null, "BJONES", null);

    assertThat(repository.update(changed)).isEqualTo(1);

    Mill saved = repository.findByMillNumber(100).orElseThrow();
    assertThat(saved)
        .usingRecursiveComparison()
        .ignoringFields("entryTimestamp", "updateTimestamp")
        .isEqualTo(
            new Mill(
                1, 100, "Renamed Mill", "01", "00067890", "02", LocalDate.of(2021, 2, 3),
                LocalDate.of(2030, 4, 5), null, 2, "JSMITH", null, "BJONES", null));
  }

  @Test
  void updatingAMissingMillChangesNothing() {
    assertThat(repository.update(mill(1, 100, "Alpha Mill", "JSMITH"))).isZero();
  }

  @Test
  void listsMillsByName() {
    repository.insert(mill(1, 300, "Charlie Mill", "JSMITH"));
    repository.insert(mill(2, 100, "Alpha Mill", "JSMITH"));
    repository.insert(mill(3, 200, "Bravo Mill", "JSMITH"));

    assertThat(repository.findAll())
        .extracting(Mill::millName)
        .containsExactly("Alpha Mill", "Bravo Mill", "Charlie Mill");
  }

  @Test
  void findsNoMillForAnUnknownNumber() {
    assertThat(repository.findByMillNumber(999)).isEmpty();
  }

  @Test
  void takesIdsFromTheMillSequence() {
    assertThat(repository.nextMillId()).isEqualTo(100);
    assertThat(repository.nextMillId()).isEqualTo(101);
  }

  @Test
  void deletesByIdAndReportsWhetherAMillWasThere() {
    repository.insert(mill(1, 100, "Alpha Mill", "JSMITH"));

    assertThat(repository.deleteById(1)).isEqualTo(1);
    assertThat(repository.deleteById(1)).isZero();
    assertThat(repository.findAll()).isEmpty();
  }

  @Test
  void refusesToDeleteAMillWithReports() {
    repository.insert(mill(1, 100, "Alpha Mill", "JSMITH"));
    database.jdbc.update("INSERT INTO MILL_REPORT VALUES (1, 1)", Map.of());

    assertThatThrownBy(() -> repository.deleteById(1))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
