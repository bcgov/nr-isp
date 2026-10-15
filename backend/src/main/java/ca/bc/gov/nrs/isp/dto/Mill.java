package ca.bc.gov.nrs.isp.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

/** A row of the {@code MILL} table, as the CGI rebuild's {@code Mill} schema returned it. */
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
