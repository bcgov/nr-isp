package ca.bc.gov.nrs.isp.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** A row of the {@code ISP_SELL_PRICE_ZONE_CODE} reference table. */
public record IspSellPriceZoneCode(
    String ispSellPriceZoneCode,
    String description,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    OffsetDateTime updateTimestamp) {}
