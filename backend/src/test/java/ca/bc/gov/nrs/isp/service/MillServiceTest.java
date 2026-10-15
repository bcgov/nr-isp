package ca.bc.gov.nrs.isp.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import ca.bc.gov.nrs.isp.dto.Mill;
import ca.bc.gov.nrs.isp.dto.NewMill;
import ca.bc.gov.nrs.isp.exception.ValidationConstraintViolationException;
import ca.bc.gov.nrs.isp.repository.ClientLocationRepository;
import ca.bc.gov.nrs.isp.repository.MillRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MillServiceTest {

  private static final LocalDate EFFECTIVE = LocalDate.of(2020, 1, 1);

  @Mock private MillRepository millRepository;
  @Mock private ClientLocationRepository clientLocationRepository;

  private MillService service;

  @BeforeEach
  void setUp() {
    service = new MillService(millRepository, clientLocationRepository);
  }

  private static NewMill newMill(String clientNumber, String clientLocnCode, LocalDate expiry) {
    return new NewMill(
        100L, "Test Mill", "01", clientNumber, clientLocnCode, EFFECTIVE, expiry, "Comment");
  }

  private static Mill stored(long millId, int revision, String updateUserid) {
    return new Mill(
        millId, 100, "Existing Mill", "01", "00012345", "01", EFFECTIVE, LocalDate.of(2099, 12, 31),
        null, revision, "SYSTEM", OffsetDateTime.of(2020, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC),
        updateUserid, OffsetDateTime.of(2024, 3, 4, 10, 0, 0, 0, ZoneOffset.ofHours(-8)));
  }

  @Test
  void insertsANewMillWithAnOpenExpiryAndTheUserInBothAuditColumns() {
    Mill inserted = stored(10, 1, "JSMITH");
    when(millRepository.findByMillNumber(100)).thenReturn(Optional.empty(), Optional.of(inserted));
    when(clientLocationRepository.exists("00012345", "01")).thenReturn(true);
    when(millRepository.nextMillId()).thenReturn(10L);

    MillService.SavedMill saved =
        service.saveMill(newMill("00012345", "01", LocalDate.of(2025, 1, 1)), "JSMITH");

    assertThat(saved.created()).isTrue();
    assertThat(saved.mill()).isEqualTo(inserted);
    ArgumentCaptor<Mill> row = ArgumentCaptor.forClass(Mill.class);
    verify(millRepository).insert(row.capture());
    assertThat(row.getValue().millId()).isEqualTo(10);
    assertThat(row.getValue().expiryDate()).isEqualTo(MillService.OPEN_EXPIRY_DATE);
    assertThat(row.getValue().entryUserid()).isEqualTo("JSMITH");
    assertThat(row.getValue().updateUserid()).isEqualTo("JSMITH");
  }

  @Test
  void refusesANewMillAtAnUnknownClientLocation() {
    when(millRepository.findByMillNumber(100)).thenReturn(Optional.empty());
    when(clientLocationRepository.exists("00099999", "99")).thenReturn(false);

    assertThatThrownBy(() -> service.saveMill(newMill("00099999", "99", null), "JSMITH"))
        .isInstanceOf(ValidationConstraintViolationException.class)
        .hasMessage("Invalid Client Location Code: 99 for Client Number 00099999 does not exist.");
    verify(millRepository, never()).insert(any());
  }

  @Test
  void updatesTheMillWithTheSameNumberWithoutRecheckingAnUnchangedClientLocation() {
    Mill updated = stored(1, 2, "BJONES");
    when(millRepository.findByMillNumber(100))
        .thenReturn(Optional.of(stored(1, 1, "SYSTEM")), Optional.of(updated));

    MillService.SavedMill saved =
        service.saveMill(newMill("00012345", "01", LocalDate.of(2030, 6, 30)), "BJONES");

    assertThat(saved.created()).isFalse();
    assertThat(saved.mill()).isEqualTo(updated);
    verify(clientLocationRepository, never()).exists(anyString(), anyString());
    ArgumentCaptor<Mill> row = ArgumentCaptor.forClass(Mill.class);
    verify(millRepository).update(row.capture());
    assertThat(row.getValue().millId()).isEqualTo(1);
    assertThat(row.getValue().millName()).isEqualTo("Test Mill");
    assertThat(row.getValue().expiryDate()).isEqualTo(LocalDate.of(2030, 6, 30));
    assertThat(row.getValue().updateUserid()).isEqualTo("BJONES");
  }

  @Test
  void keepsTheStoredExpiryWhenAnUpdateOmitsIt() {
    when(millRepository.findByMillNumber(100)).thenReturn(Optional.of(stored(1, 1, "SYSTEM")));

    service.saveMill(newMill("00012345", "01", null), "BJONES");

    ArgumentCaptor<Mill> row = ArgumentCaptor.forClass(Mill.class);
    verify(millRepository).update(row.capture());
    assertThat(row.getValue().expiryDate()).isEqualTo(LocalDate.of(2099, 12, 31));
  }

  @Test
  void checksAChangedClientLocationOnUpdate() {
    when(millRepository.findByMillNumber(100)).thenReturn(Optional.of(stored(1, 1, "SYSTEM")));
    when(clientLocationRepository.exists("00012345", "99")).thenReturn(false);

    assertThatThrownBy(() -> service.saveMill(newMill("00012345", "99", null), "BJONES"))
        .isInstanceOf(ValidationConstraintViolationException.class)
        .hasMessageContaining("Invalid Client Location Code");
    verify(millRepository, never()).update(any());
  }

  @Test
  void refusesAnUpdateThatExpiresBeforeItTakesEffect() {
    when(millRepository.findByMillNumber(100)).thenReturn(Optional.of(stored(1, 1, "SYSTEM")));

    assertThatThrownBy(
            () -> service.saveMill(newMill("00012345", "01", LocalDate.of(2019, 12, 31)), "BJONES"))
        .isInstanceOf(ValidationConstraintViolationException.class)
        .hasMessage("Effective date cannot be after expiry date.");
    verify(millRepository, never()).update(any());
  }

  @Test
  void reportsWhetherADeleteFoundTheMill() {
    when(millRepository.deleteById(1)).thenReturn(1);
    when(millRepository.deleteById(999)).thenReturn(0);

    assertThat(service.deleteMill(1)).isTrue();
    assertThat(service.deleteMill(999)).isFalse();
  }

  @Test
  void exportsQuotedCsvWithTheCgiRebuildColumns() {
    Mill quoted =
        new Mill(
            1, 100, "Mill \"A\", Ltd", null, "00012345", "01", EFFECTIVE,
            LocalDate.of(9999, 12, 31), "Moved, 2024", 3, "SYSTEM", null, "JSMITH",
            OffsetDateTime.of(2024, 3, 4, 23, 30, 0, 0, ZoneOffset.ofHours(-8)));
    when(millRepository.findAll()).thenReturn(List.of(quoted));

    String csv = new String(service.exportMillsAsCsv(), StandardCharsets.UTF_8);

    assertThat(csv)
        .isEqualTo(
            "Mill Number,Mill Name,Zone,Client Number,Client Location,Comments,Effective Date,"
                + "Expiry Date,Update Date,Update ID\n"
                + "100,\"Mill \"\"A\"\", Ltd\",\"\",\"00012345\",\"01\",\"Moved, 2024\","
                + "2020-01-01,9999-12-31,2024-03-04,\"JSMITH\"\n");
  }

  @Test
  void exportsAPdf() {
    when(millRepository.findAll()).thenReturn(List.of(stored(1, 1, "JSMITH")));

    byte[] pdf = service.exportMillsAsPdf();

    assertThat(new String(pdf, 0, 5, StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
  }
}
