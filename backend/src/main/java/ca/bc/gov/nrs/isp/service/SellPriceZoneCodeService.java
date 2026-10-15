package ca.bc.gov.nrs.isp.service;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import ca.bc.gov.nrs.isp.repository.SellPriceZoneCodeRepository;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * ISP sell price zones. The CGI rebuild cached this list; caching waits for the reference-data
 * cache that will serve every code table.
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
