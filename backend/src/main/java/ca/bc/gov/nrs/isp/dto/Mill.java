package ca.bc.gov.nrs.isp.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** A row of the {@code MILL} table. */
public record Mill(
    long millId,
    long millNumber,
    String millName,
    String ispSellPriceZoneCode,
    String clientNumber,
    String clientLocnCode,
    LocalDate effectiveDate,
    LocalDate expiryDate,
    String comments,
    int revisionCount,
    String entryUserid,
    OffsetDateTime entryTimestamp,
    String updateUserid,
    OffsetDateTime updateTimestamp) {}
