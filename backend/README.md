# ISP Backend

Spring Boot API for ISP (Interior Selling Price).

| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 21.0.12+ | Runtime |
| Spring Boot | 3.5.x | Framework |
| Spring Security | Boot-managed | OAuth2 resource server with BC Gov SSO JWTs |
| Undertow | Boot-managed | Embedded HTTP server (Tomcat excluded) |
| Oracle JDBC | 21.3.x (ojdbc11) | TCPS connection to the shared Oracle database |
| Micrometer Prometheus | Boot-managed | Metrics at `/actuator/prometheus` |

## Running locally

See the [root README](../README.md#local-development) for the property files and both ways to run.

```bash
mvn -DskipTests spring-boot:run -Dspring-boot.run.profiles=local,oracle
mvn verify   # unit and security tests, JaCoCo report in target/site/jacoco
```

## Profiles

| Profile | Effect |
|---|---|
| (none) | API only. Datasource auto-configuration is off, so no database is needed and endpoints that need it answer 503. |
| `oracle` | Enables the Oracle datasource, `JdbcTemplate` and `NamedParameterJdbcTemplate`; startup fails if Oracle is unreachable. |
| `local` | Loads the gitignored `application-local.yml`. |
| `test` | Used by tests; supplies a placeholder SSO issuer and client ID. |

Deployments set `ISP_REQUIRE_ORACLE_PROFILE=true`, which stops a pod that starts without `oracle`.

## Settings

| Variable | Description | Default |
|---|---|---|
| `ISP_OIDC_ISSUER_URI` | BC Gov SSO realm issuer | Required |
| `ISP_OIDC_CLIENT_ID` | ISP browser client; tokens must carry it as `azp` | Required |
| `ISP_OIDC_JWK_SET_URI` | Signing-key endpoint override | `<issuer>/protocol/openid-connect/certs` |
| `DATABASE_HOST` | Oracle TCPS host, also used by the truststore init container | Required with `oracle` |
| `DATABASE_PORT` | Oracle TCPS port | `1543` |
| `DATABASE_SERVICE_NAME` | Oracle service name | Required with `oracle` |
| `DATABASE_USER`, `DATABASE_PASSWORD` | ISP Oracle account | Required with `oracle` |
| `TRUSTSTORE_PATH` | JKS truststore for the Oracle certificate chain | `/cert/jssecacerts` |
| `KEYSTORE_SECRET` | Truststore password | Required with `oracle` |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API cross-origin | `http://localhost:3000` locally, empty when deployed |
| `APP_LOG_LEVEL` | Log level for `ca.bc.gov.nrs.isp` | `INFO` |

The API refuses to start without the SSO issuer and client ID, so it never runs unsecured.

## Code layout

| Package | Contents |
|---|---|
| `ca.bc.gov.nrs.isp` | `IspApiApplication` |
| `configuration` | `/api` prefix, security rules and CORS, Oracle datasource checks, settings records |
| `security` | Token validation, FAM role mapping, `IspRoles`, `IspUser` |
| `controller` | REST controllers. Map them without `/api`; `ApiPathConfiguration` adds it. `ApiExceptionHandler` turns rejected input into plain-text 400s. |
| `dto` | Request and response records |
| `service` | Business rules, `@Profile("oracle")` |
| `repository` | `NamedParameterJdbcTemplate` and SQL, `@Profile("oracle")` |
| `exception` | `ValidationConstraintViolationException` for business-rule failures |

Port business code into these packages, keeping the CGI rebuild's endpoint paths; the mill names
classes (`MillController`, `MillService`, `MillRepository` and their tests) are the worked example,
described under "Porting pattern" in [docs/architecture.md](../docs/architecture.md).
`SecurityConfiguration` already holds its access rules; a new endpoint needs a rule change only
when it departs from "Approvers read, Administrators write".

## B.C. Pacific Time

B.C. stays on UTC−7 from November 1, 2026. Java ships its own timezone rules, so the backend needs
Java 21.0.12 or newer ([IANA tzdata 2026b](https://www.iana.org/time-zones/releases/2026b)). The
Docker build runs `checks/VerifyTimezone.java` on the runtime image and fails on older rules. Check
a local JDK with `java checks/VerifyTimezone.java`.
