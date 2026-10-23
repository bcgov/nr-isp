[![License](https://img.shields.io/github/license/bcgov/nr-isp.svg)](/LICENSE)
[![Merge](https://github.com/bcgov/nr-isp/actions/workflows/merge.yml/badge.svg)](https://github.com/bcgov/nr-isp/actions/workflows/merge.yml)
[![Analysis](https://github.com/bcgov/nr-isp/actions/workflows/analysis.yml/badge.svg)](https://github.com/bcgov/nr-isp/actions/workflows/analysis.yml)
[![Scheduled](https://github.com/bcgov/nr-isp/actions/workflows/scheduled.yml/badge.svg)](https://github.com/bcgov/nr-isp/actions/workflows/scheduled.yml)

# ISP - Interior Selling Price

ISP collects mill sales summary submissions, lets ministry staff review and approve them, maintains
the reference data they are checked against, and produces the R10–R13 reports.

| Component | Technology |
|-----------|------------|
| Frontend | React 19, TypeScript, Vite, Carbon Design System, served by Caddy with the Coraza WAF |
| Backend | Spring Boot 3.5, Java 21, Undertow |
| Database | Oracle (shared, BC Gov-managed), Spring JDBC |
| Auth | BC Gov SSO (Keycloak) with roles managed in FAM; IDIR only |
| Platform | OpenShift (Gold), deployed by GitHub Actions |

## Status

This repository is the OpenShift home for ISP. It started from the BC Gov
[quickstart-openshift](https://github.com/bcgov/quickstart-openshift) template and follows the
infrastructure and framework of [nr-lexis](https://github.com/bcgov/nr-lexis).

The platform scaffold is in place: both images, OpenShift templates, PR previews, TEST and PROD
promotion, BC Gov SSO sign-in with FAM roles, and the ISP access rules. Business features are
ported page by page from CGI's Spring MVC and React rebuild in the private `bcgov-c/nr-isp`
repository. Until a page is ported, its navigation entry opens a placeholder.

See [docs/architecture.md](docs/architecture.md) for the runtime architecture, the access rules and
the remaining porting work.

## Local development

Two ways to run ISP locally:

| | Option A - direct on host | Option B - Docker Compose |
|---|---|---|
| Backend hot reload | Manual restart | Manual restart |
| Frontend hot reload (Vite HMR) | Yes | Yes |
| Setup | Java 21 + Maven + Node 24 on the host | Docker Desktop |

### Prerequisites

1. Network access to the BC Gov Oracle environment, if you need the database.
2. Java 21.0.12 or newer and Maven 3.9+ (Option A). Older Java 21 builds have outdated B.C. time
   rules; check yours with `java backend/checks/VerifyTimezone.java`.
3. Node 24+ (Option A).
4. A BC Gov SSO (CSS) public browser client for ISP with `http://localhost:3000` as a web origin
   and post-logout URI, and `http://localhost:3000/authCallback` as a redirect URI.

### Files you create once

These are gitignored and stay local. Obtain credentials through approved team channels.

`backend/src/main/resources/application-local.yml`, activated by the `local` profile:

```yaml
isp:
  auth:
    oidc:
      issuer-uri: https://dev.loginproxy.gov.bc.ca/auth/realms/standard
      client-id: <ISP CSS client ID>
DATABASE_HOST: <Oracle host>
DATABASE_SERVICE_NAME: <Oracle service name>
DATABASE_USER: <user>
DATABASE_PASSWORD: <password>
KEYSTORE_SECRET: <truststore password>
TRUSTSTORE_PATH: src/main/resources/cert/jssecacerts
```

`backend/src/main/resources/cert/jssecacerts`: Java keystore with the CA chain for the Oracle TCPS
connection. Only needed with the `oracle` profile.

`frontend/.env`: copy `frontend/.env.example` and set the SSO issuer and client ID.

### Option A - direct on host

```bash
cd backend
mvn -DskipTests spring-boot:run -Dspring-boot.run.profiles=local,oracle
```

Drop `oracle` from the profiles to run the API without a database.

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`.

### Option B - Docker Compose

```bash
docker compose up
```

- `backend` on `localhost:8080`, using profiles `local,oracle`.
- `frontend` on `localhost:3000` (Vite).
- `docker compose --profile caddy up caddy backend` builds the production frontend image and
  serves it on `localhost:3005`.

## Tests

| What | Command |
|---|---|
| Backend unit and security tests | `cd backend && mvn verify` |
| Frontend type check, lint, format | `cd frontend && npm run typecheck && npm run lint && npm run format:check` |
| Frontend unit tests with coverage | `cd frontend && npm run test:cov` |
| Frontend smoke tests (Playwright) | `cd frontend && npm run e2e` |
| Release script tests | `node --test .github/scripts/release-images.test.mjs` |

## Deployments

ISP follows the quickstart-openshift build-once/promote model, as nr-lexis does.

| Event | Workflow | Result |
|---|---|---|
| Pull request | `pr-open.yml` | Builds both images tagged with the PR number, runs the tests, deploys a DEV preview at `https://nr-isp-<PR % 50>.apps.gold.devops.gov.bc.ca`, then runs the smoke suite against it |
| PR closed | `pr-close.yml` | Promotes the PR images and deletes the preview |
| Merge to `main` | `merge.yml` | Deploys the merged PR's images to TEST by digest, runs the smoke suite and records a release candidate |
| Manual | `release-prod.yml` | Deploys the tested image digests of a tagged `main` commit to PROD at `https://isp.nrs.gov.bc.ca` |

To release, wait for the commit's Merge run to pass, tag that commit (for example `v1.0.0`), then
run **Release PROD** from `main` with the tag. A missing, expired or mismatched release-candidate
artifact stops the release. If a Merge run fails, use **Re-run all jobs** to redeploy and retest its
images; partial reruns cannot publish a release candidate. A rollback uses the same release workflow
with a retained, previously tested tag.

### GitHub environment settings

Set these on the `dev`, `test` and `prod` GitHub Environments only. GitHub silently falls back to a
repository- or organization-level value of the same name when an environment lacks one, so a PROD
deploy could run against TEST settings. Every deployment fails if any of these settings exists
outside an environment, or if an environment's value is missing, has another environment's
namespace suffix, or points at another environment's SSO realm
(`.github/scripts/check-deploy-settings.sh`). `oc_server` and `ISP_OIDC_IDIR_HINT` are the same
everywhere and are exempt from the repository-level check.

| Setting | Kind | Notes |
|---|---|---|
| `oc_namespace` | Secret | OpenShift namespace; must end in `-dev`, `-test` or `-prod` to match |
| `oc_token` | Secret | Deployer service-account token for that namespace |
| `oc_server` | Variable | OpenShift API URL |
| `database_host`, `database_service_name` | Secret | Oracle TCPS host and service |
| `database_user`, `database_password` | Secret | Least-privilege ISP Oracle account |
| `keystore_secret` | Secret | Password for the generated Oracle truststore |
| `ISP_OIDC_ISSUER_URI` | Variable | BC Gov SSO realm issuer for that environment |
| `ISP_OIDC_CLIENT_ID` | Variable | ISP CSS browser client ID |
| `ISP_OIDC_IDIR_HINT` | Variable | Optional; defaults to `azureidir` |
| `ALLOWED_ORIGINS` | Variable | Optional; extra origins that call the API directly |
| `VANITY_HOST` | Variable | PROD only; `isp.nrs.gov.bc.ca` (hostname only) |
| `VANITY_TLS_CERTIFICATE` | Secret | PROD only; PEM leaf/server certificate for `isp.nrs.gov.bc.ca` |
| `VANITY_TLS_KEY` | Secret | PROD only; matching unencrypted PEM private key |
| `VANITY_TLS_CA_CERTIFICATE` | Secret | PROD only; PEM CA chain in issuer order |
| `SYSDIG_API_TOKEN` | Secret | PROD only; optional, syncs `monitoring/alerts/` |

`sonar_token_backend` and `sonar_token_frontend` are optional repository secrets for SonarCloud.

## Component docs

- [docs/architecture.md](docs/architecture.md) - runtime architecture, access rules and porting status.
- [backend/README.md](backend/README.md) - Spring profiles, settings and code layout.
- [frontend/README.md](frontend/README.md) - scripts, runtime configuration and code layout.
