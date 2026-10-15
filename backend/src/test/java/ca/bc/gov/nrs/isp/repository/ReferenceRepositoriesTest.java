package ca.bc.gov.nrs.isp.repository;

import static org.assertj.core.api.Assertions.assertThat;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** The reference tables the mill names page reads. */
class ReferenceRepositoriesTest {

  private OracleModeDatabase database;

  @BeforeEach
  void setUp() {
    database = new OracleModeDatabase();
  }

  @AfterEach
  void tearDown() {
    database.close();
  }

  @Test
  void findsAClientLocationByClientNumberAndLocationCode() {
    database.jdbc.update("INSERT INTO CLIENT_LOCATION VALUES ('00012345', '01')", Map.of());
    ClientLocationRepository repository = new ClientLocationRepository(database.jdbc);

    assertThat(repository.exists("00012345", "01")).isTrue();
    assertThat(repository.exists("00012345", "02")).isFalse();
    assertThat(repository.exists("00099999", "01")).isFalse();
  }

  @Test
  void listsSellPriceZonesByCode() {
    database.jdbc.update(
        "INSERT INTO ISP_SELL_PRICE_ZONE_CODE VALUES "
            + "('02', 'Interior', DATE '2001-02-03', DATE '9999-12-31', TIMESTAMP '2024-05-06 07:08:09')",
        Map.of());
    database.jdbc.update(
        "INSERT INTO ISP_SELL_PRICE_ZONE_CODE VALUES "
            + "('01', 'Coast', DATE '2000-01-01', DATE '2020-12-31', CURRENT_TIMESTAMP)",
        Map.of());

    var zones = new SellPriceZoneCodeRepository(database.jdbc).findAll();

    assertThat(zones).extracting(IspSellPriceZoneCode::ispSellPriceZoneCode).containsExactly("01", "02");
    IspSellPriceZoneCode interior = zones.get(1);
    assertThat(interior.description()).isEqualTo("Interior");
    assertThat(interior.effectiveDate()).isEqualTo(LocalDate.of(2001, 2, 3));
    assertThat(interior.expiryDate()).isEqualTo(LocalDate.of(9999, 12, 31));
    assertThat(interior.updateTimestamp().toLocalDateTime())
        .isEqualTo(LocalDate.of(2024, 5, 6).atTime(7, 8, 9));
  }
}
