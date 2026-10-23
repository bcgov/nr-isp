package ca.bc.gov.nrs.isp.controller;

import static ca.bc.gov.nrs.isp.controller.OracleServices.require;

import ca.bc.gov.nrs.isp.dto.IspSellPriceZoneCode;
import ca.bc.gov.nrs.isp.service.SellPriceZoneCodeService;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SellPriceZoneCodeController {

  private final ObjectProvider<SellPriceZoneCodeService> sellPriceZoneCodeService;

  public SellPriceZoneCodeController(
      ObjectProvider<SellPriceZoneCodeService> sellPriceZoneCodeService) {
    this.sellPriceZoneCodeService = sellPriceZoneCodeService;
  }

  @GetMapping("/isp-sell-price-zone-codes")
  public List<IspSellPriceZoneCode> getSellPriceZoneCodes() {
    return require(sellPriceZoneCodeService).getSellPriceZoneCodes();
  }
}
