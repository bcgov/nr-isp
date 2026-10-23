#!/usr/bin/env bash
# Fail-closed checks for deployment settings.
#
# GitHub gives a job its environment's secret or variable, else the repository's, else the
# organization's, and nothing shows which level supplied it. A PROD job missing a value would
# silently use a repository-level TEST value. ISP keeps every deployment setting in the dev, test
# and prod GitHub Environments only, and these checks make that rule fail closed:
#
#   check-deploy-settings.sh list               names that must never exist outside an environment
#   check-deploy-settings.sh shared             in a job WITHOUT an environment: fail if any is set
#   check-deploy-settings.sh environment <env>  in a deploy job: fail on missing or mismatched values
#
# Values are read from same-named environment variables and are never printed.
set -euo pipefail

# Settings that reach or identify one environment: its namespace, database, SSO realm and client,
# allowed origins and PROD hostname. Any of them falling back would deploy against the wrong one.
ENVIRONMENT_ONLY=(
  OC_NAMESPACE OC_TOKEN
  DATABASE_HOST DATABASE_SERVICE_NAME DATABASE_USER DATABASE_PASSWORD KEYSTORE_SECRET
  ISP_OIDC_ISSUER_URI ISP_OIDC_CLIENT_ID ALLOWED_ORIGINS
  VANITY_HOST VANITY_TLS_CERTIFICATE VANITY_TLS_KEY VANITY_TLS_CA_CERTIFICATE
)

# Settings every deployment needs from its own environment.
REQUIRED=(
  OC_NAMESPACE OC_TOKEN OC_SERVER
  DATABASE_HOST DATABASE_SERVICE_NAME DATABASE_USER DATABASE_PASSWORD KEYSTORE_SECRET
  ISP_OIDC_ISSUER_URI ISP_OIDC_CLIENT_ID
)

is_blank() { [[ -z "${1//[[:space:]]/}" ]]; }

case "${1:-}" in
  list)
    printf '%s\n' "${ENVIRONMENT_ONLY[@]}"
    ;;

  shared)
    found=()
    for name in "${ENVIRONMENT_ONLY[@]}"; do
      is_blank "${!name:-}" || found+=("$name")
    done
    if ((${#found[@]})); then
      echo "::error title=Deployment settings outside an environment::${found[*]} must not be set at repository or organization level: an environment without its own value would silently use it. Set them only in the dev, test and prod GitHub Environments."
      exit 1
    fi
    echo "No deployment settings are set at repository or organization level."
    ;;

  environment)
    env_name="${2:?environment name is required}"
    case "$env_name" in
      dev) issuer_prefix=https://dev.loginproxy.gov.bc.ca/auth/realms/ ;;
      test) issuer_prefix=https://test.loginproxy.gov.bc.ca/auth/realms/ ;;
      prod) issuer_prefix=https://loginproxy.gov.bc.ca/auth/realms/ ;;
      *)
        echo "::error title=Unknown environment::Deployments run only in dev, test or prod, not '${env_name}'."
        exit 1
        ;;
    esac

    failed=0
    missing=()
    for name in "${REQUIRED[@]}"; do
      if is_blank "${!name:-}"; then missing+=("$name"); fi
    done
    if ((${#missing[@]})); then
      echo "::error title=Missing deployment settings::${missing[*]} must be set in the ${env_name} GitHub Environment."
      failed=1
    fi
    if [[ "${OC_NAMESPACE:-}" != *-"$env_name" ]]; then
      echo "::error title=Wrong OpenShift namespace::oc_namespace must be the ${env_name} namespace, ending in -${env_name}."
      failed=1
    fi
    # A DEV or TEST realm in PROD would let PROD trust that realm's users.
    if ! is_blank "${ISP_OIDC_ISSUER_URI:-}" && [[ "$ISP_OIDC_ISSUER_URI" != "$issuer_prefix"* ]]; then
      echo "::error title=Wrong SSO realm::ISP_OIDC_ISSUER_URI must be the ${env_name} BC Gov SSO realm, starting ${issuer_prefix}"
      failed=1
    fi
    if ((failed == 0)); then
      echo "Deployment settings for ${env_name} are present and match the environment."
    fi
    exit "$failed"
    ;;

  *)
    echo "Usage: $0 list | shared | environment <dev|test|prod>" >&2
    exit 2
    ;;
esac
