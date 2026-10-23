package ca.bc.gov.nrs.isp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Body of {@code POST /mills}, which creates a mill or updates the one with the same mill number.
 * Limits match the {@code MILL} columns.
 */
public record NewMill(
    @NotNull Long millNumber,
    @NotBlank @Size(max = 100) String millName,
    @Size(max = 2) String ispSellPriceZoneCode,
    @NotBlank @Size(max = 8) String clientNumber,
    @NotBlank @Size(max = 2) String clientLocnCode,
    @NotNull LocalDate effectiveDate,
    LocalDate expiryDate,
    @Size(max = 4000) String comments) {}
