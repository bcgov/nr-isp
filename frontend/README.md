# ISP Frontend

React single-page application for ISP, served in OpenShift by Caddy with the Coraza WAF.

| Technology | Purpose |
|---|---|
| React 19, TypeScript | UI |
| Vite | Dev server and build |
| Carbon Design System (`@carbon/react`) | Components and themes |
| React Router | Routing |
| `oidc-client-ts` | BC Gov SSO sign-in (authorization code with PKCE) |
| Vitest, Testing Library | Unit tests |
| Playwright | Smoke tests against a running frontend |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite on `localhost:3000`, proxying `/api` to `VITE_DEV_BACKEND_TARGET` |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` / `lint` / `format:check` | Quality checks run in CI |
| `npm run test:unit` | Vitest in watch mode |
| `npm run test:cov` | Vitest once with coverage thresholds |
| `npm run e2e` | Playwright smoke suite; starts Vite unless `CI` and `E2E_BASE_URL` are set |

## Runtime configuration

One image runs in every environment. At container start `docker-entrypoint.sh` writes
`/srv/config.js` from these variables; `index.html` loads it before the bundle and `src/env.ts`
prefers it over build-time `import.meta.env` values. Locally, put them in `.env`.

| Variable | Description |
|---|---|
| `VITE_OIDC_ISSUER_URI` | BC Gov SSO realm issuer (required) |
| `VITE_OIDC_CLIENT_ID` | ISP public browser client ID (required) |
| `VITE_OIDC_IDIR_HINT` | `kc_idp_hint` for IDIR; defaults to `azureidir` |

The container refuses to start without the issuer and client ID. The SSO client must allow
`<origin>/authCallback` as a redirect URI and `<origin>` as a post-logout URI.

## Code layout

| Path | Contents |
|---|---|
| `src/service/oidc-service.ts` | Sign-in, shared token refresh and sign-out |
| `src/service/api-service.ts` | `apiFetch` / `apiGetJson`: adds the bearer token and retries a 401 once after a forced refresh |
| `src/context/auth/` | `AuthProvider` loads `/api/session/me`; `useAuth()` exposes the user and roles |
| `src/routes/navigation.ts` | Side-navigation entries, using the CGI rebuild's paths and labels |
| `src/routes/AppRoutes.tsx` | Signed-out, no-access, error and signed-in route sets |
| `src/pages/` | One folder per page; `NotPorted` stands in for pages still to port |
| `src/components/Layout.tsx` | Carbon header, side navigation, theme toggle and logout |

To port a page, add it under `src/pages/` and register it in `PAGES` in `src/routes/AppRoutes.tsx`
under its navigation path; it then replaces the `NotPorted` placeholder.
