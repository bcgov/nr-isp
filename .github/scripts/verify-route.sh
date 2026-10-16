#!/usr/bin/env bash
set -euo pipefail

namespace="${1:?namespace is required}"
route_name="${2:?Route name is required}"
expected_host="${3:?expected hostname is required}"
expected_service="${4:?expected Service is required}"
attempts="${5:-30}"
sleep_seconds="${6:-2}"

# Project only routing and admission fields. Full Route JSON includes the PROD TLS private key.
route_jsonpath='{.spec.host}{"\t"}{.spec.to.kind}{"\t"}{.spec.to.name}{"\n"}{range .status.ingress[*]}{.host}{"\t"}{range .conditions[?(@.type=="Admitted")]}{.status}{"\t"}{.reason}{end}{"\n"}{end}'

for ((attempt = 1; attempt <= attempts; attempt += 1)); do
  route_fields="$(oc get route "$route_name" --namespace "$namespace" \
    --request-timeout=5s -o "jsonpath=${route_jsonpath}")"
  IFS=$'\t' read -r actual_host actual_kind actual_service <<< "${route_fields%%$'\n'*}"
  if [[ "$actual_host" != "$expected_host" || "$actual_kind" != Service || "$actual_service" != "$expected_service" ]]; then
    echo "::error::Route ${route_name} does not target ${expected_host} through Service ${expected_service}."
    exit 1
  fi

  admission_reason=pending
  if [[ "$route_fields" == *$'\n'* ]]; then
    while IFS=$'\t' read -r ingress_host admitted reason; do
      # Router status can still refer to the previous hostname while a Route update reconciles.
      if [[ "$ingress_host" == "$expected_host" ]]; then
        if [[ "$admitted" == True ]]; then
          echo "Route ${route_name} is admitted for ${expected_host} through Service ${expected_service}."
          exit 0
        fi
        admission_reason="${reason:-pending}"
      fi
    done <<< "${route_fields#*$'\n'}"
  fi

  echo "Waiting for Route ${route_name} admission (attempt ${attempt}/${attempts}, ${admission_reason})."
  if ((attempt < attempts)); then
    sleep "$sleep_seconds"
  fi
done

echo "::error::Route ${route_name} was not admitted for ${expected_host} (${admission_reason}). Check for another Route claiming this hostname before using the preview or releasing."
exit 1
