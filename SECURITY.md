# Security Policy

## Supported Versions

Only the current `main` branch is in scope for security updates. Older branches and unreleased snapshots are not supported.

## Reporting a Vulnerability

**DO NOT open public GitHub issues for security vulnerabilities.**

If you believe you have found a security vulnerability in this project, please report it privately:

1. Navigate to the main page of this repository on GitHub.
2. Click the **"Security"** tab at the top of the repository (next to "Insights").
3. In the left sidebar under "Reporting", click **"Advisories"**.
4. Click the **"Report a vulnerability"** button to privately submit a report to the repository maintainers.

## Security Controls

| Area | Control | Where |
| :--- | :--- | :--- |
| Web application firewall | Coraza WAF runs inline in the Caddy frontend proxy. | `frontend/Dockerfile`, `frontend/Caddyfile`, `frontend/coraza.conf` |
| HTTP security headers | Caddy strips the `Server` header and sets CSP, HSTS, framing, referrer and cross-origin policies. | `frontend/Caddyfile` |
| Authentication | Interactive users sign in through BC Gov SSO (Keycloak) with FAM-managed roles; the backend validates every access token. | `backend/src/main/java/ca/bc/gov/nrs/isp/security/` |
| Secret management | Database credentials and certificate material come from GitHub Environment secrets and OpenShift Secrets, never the repository. | `backend/openshift.deploy.yml`, `.github/workflows/reusable-deploy.yml` |
| Container hardening | `readOnlyRootFilesystem`, `runAsNonRoot`, no privilege escalation and all capabilities dropped. | `backend/openshift.deploy.yml`, `frontend/openshift.deploy.yml` |
| Network segmentation | NetworkPolicies admit the router to the frontend only, and the frontend and monitoring to the backend only. | `backend/openshift.deploy.yml`, `frontend/openshift.deploy.yml` |
| Build-time scanning | Trivy filesystem scans on every PR and push to `main`; Renovate keeps dependencies current. | `.github/workflows/analysis.yml`, `renovate.json` |
| Dynamic scanning | Weekly OWASP ZAP full scan against TEST. | `.github/workflows/scheduled.yml` |

## Vulnerability Triage SLAs

All security issues are triaged using CISA KEV status and CVSS scores:
- **Critical** (CVSS 9.0-10.0 or CISA KEV): Remediation within 24 hours.
- **High** (CVSS 7.0-8.9): Remediation within 1 week.
- **Medium** (CVSS 4.0-6.9): Remediation within 2 weeks.
- **Low** (CVSS 0.0-3.9): Remediation next scheduled release.

Trivy reports findings at every severity to the GitHub Security tab on each run, where they are triaged against the windows above. Findings are not a merge gate, because advisories are published independently of any contribution. Committed secrets are blocked at push time by GitHub secret scanning push protection instead.

