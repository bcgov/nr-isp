package ca.bc.gov.nrs.isp.service;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import ca.bc.gov.nrs.isp.repository.SellPriceZoneCodeRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * ISP sell price zones, read from Oracle on each call until a shared reference-data cache serves
 * the code tables.
 */
@Service
@Profile("oracle")
public class SellPriceZoneCodeService {

  private final SellPriceZoneCodeRepository repository;

  public SellPriceZoneCodeService(SellPriceZoneCodeRepository repository) {
    this.repository = repository;
  }

  public List<IspSellPriceZoneCode> getSellPriceZoneCodes() {
    return repository.findAll();
  }
}
