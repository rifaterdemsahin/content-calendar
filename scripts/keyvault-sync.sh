#!/usr/bin/env bash
# ==============================================================================
# Helper to inspect, export, or sync Azure Key Vault secrets for Delivery Pilot
# ==============================================================================

set -euo pipefail

VAULT_NAME="${VAULT_NAME:-dp-kv-deliverypilot}"
ACTION="${1:-list}"

case "$ACTION" in
  list|show)
    echo "Querying secret names in Azure Key Vault '$VAULT_NAME'..."
    az keyvault secret list --vault-name "$VAULT_NAME" --query "[].{name:name, enabled:attributes.enabled, expires:attributes.expires}" -o table
    ;;
  get)
    if [[ -z "${2:-}" ]]; then
      echo "Usage: ./scripts/keyvault-sync.sh get <SECRET_NAME>"
      exit 1
    fi
    az keyvault secret show --vault-name "$VAULT_NAME" -n "$2" --query "{name:name, value:value}" -o json
    ;;
  env)
    echo "# Generated from Azure Key Vault: $VAULT_NAME ($(date -u))"
    echo "# DO NOT COMMIT THIS FILE"
    for s in CC-ADMIN-TOKEN CC-ENTRA-CLIENT-SECRET CC-SESSION-SECRET ANTHROPIC-API-KEY DAYTONA-API-KEY github-pat; do
      val=$(az keyvault secret show --vault-name "$VAULT_NAME" -n "$s" --query value -o tsv 2>/dev/null || true)
      env_key=$(echo "$s" | tr '-' '_' | tr '[:lower:]' '[:upper:]')
      if [[ "$s" == "CC-ENTRA-CLIENT-SECRET" ]]; then env_key="CLIENT_SECRET"; fi
      if [[ "$s" == "CC-SESSION-SECRET" ]]; then env_key="SESSION_SECRET"; fi
      if [[ "$s" == "github-pat" ]]; then env_key="GITHUB_PAT"; fi
      if [[ -n "$val" ]]; then
        echo "${env_key}=\"${val}\""
      else
        echo "# ${env_key}=<not found in vault>"
      fi
    done
    ;;
  *)
    echo "Usage: ./scripts/keyvault-sync.sh [list|get <secret>|env]"
    exit 1
    ;;
esac
