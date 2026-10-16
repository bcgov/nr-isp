# AGENTS.md

Repository facts for automated coding assistants. Teams may edit or remove this file.

## What this is
- ISP (Interior Selling Price) on OpenShift. Business features are being ported from CGI's rebuild in the private `bcgov-c/nr-isp` repository; infrastructure follows `bcgov/nr-lexis`.
- See `docs/architecture.md` for the runtime model, access rules and porting status.

## Layout
- `backend/`: Spring Boot 3.5, Java 21, Undertow, Spring JDBC on Oracle (no JPA). Package `ca.bc.gov.nrs.isp`.
- `frontend/`: React 19, TypeScript, Vite, Carbon; served by Caddy + Coraza (`Caddyfile`, `coraza.conf`, `docker-entrypoint.sh`).
- OpenShift templates (not Helm): `backend/openshift.deploy.yml`, `frontend/openshift.deploy.yml`, `frontend/openshift.route.yml`, `frontend/openshift.vanity-route.yml`.
- Workflows: `.github/workflows/` (PR previews via `reusable-deploy.yml`, smoke tests via `reusable-tests.yml`, TEST on merge, PROD by `release-prod.yml`); release digest handling in `.github/scripts/release-images.mjs`.

## Conventions
- REST controllers map paths without `/api`; `ApiPathConfiguration` adds the prefix. Keep the CGI rebuild's endpoint paths when porting.
- Access rules live in `backend/.../configuration/SecurityConfiguration.java`; roles are `ISP_ADMIN` and `ISP_APPROVER` (`security/IspRoles.java`). The backend is the security boundary; frontend role checks are for display only.
- Frontend API calls go through `src/service/api-service.ts` (`apiFetch`, `apiGetJson`).
- Ported pages register in `PAGES` in `frontend/src/routes/AppRoutes.tsx`; navigation entries live in `frontend/src/routes/navigation.ts`.

## Build, test, run
- Backend (`cd backend`): `mvn verify`; run with `mvn -DskipTests spring-boot:run -Dspring-boot.run.profiles=local,oracle`.
- Frontend (`cd frontend`): `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:cov`, `npm run build`; smoke tests `npm run e2e`.
- Release script tests: `node --test .github/scripts/release-images.test.mjs`.
- Full stack locally: `docker compose up` (optional profile: `caddy`).
- Deploys to OpenShift run from GitHub Actions (PR open, merge, Release PROD), not from a workstation.

## Shared actions
- Uses bcgov shared actions and workflows (`bcgov/action-*`, `bcgov/actions/*`, `bcgov/quickstart-openshift-helpers`). Use them as provided; don't copy or fork them.
- Never pin `@main`. Pin bcgov shared actions to a published release SHA with a `# vX.Y.Z` comment.

## Settings
- Automated agents must not change repository or organization settings. Settings changes are made by a person on the team.
