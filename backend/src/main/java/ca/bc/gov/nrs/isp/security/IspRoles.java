package ca.bc.gov.nrs.isp.security;

import java.util.List;

/**
 * ISP application roles. Names match the FAM client roles exactly and are used unchanged as Spring
 * Security authorities, as the CGI rebuild's {@code Roles} constants were.
 *
 * <ul>
 *   <li>{@link #ISP_ADMIN}: every read and write, including reference-table maintenance.
 *   <li>{@link #ISP_APPROVER}: every read, report generation and the sales-summary approval
 *       workflow; no other writes.
 * </ul>
 */
public final class IspRoles {

  public static final String ISP_ADMIN = "ISP_ADMIN";
  public static final String ISP_APPROVER = "ISP_APPROVER";

  public static final List<String> ALL = List.of(ISP_ADMIN, ISP_APPROVER);

  private IspRoles() {}
}
