#!/usr/bin/env bash
# ==============================================================================
# Content Calendar & Delivery Pilot - Automated Deploy Script
# Uses Azure Key Vault for all application keys and secrets.
#
# Usage:
#   ./scripts/deploy.sh [OPTIONS]
#
# Options:
#   --all             Deploy both Fly.io site and Azure Function API (default)
#   --site            Deploy only the Fly.io site (with Key Vault secrets)
#   --api             Deploy only the Azure Function API (with Key Vault refs)
#   --sync-keys       Sync Key Vault secrets to Fly.io & Function App without deploying
#   --verify          Verify access to Key Vault and status of secrets
#   --dry-run         Print commands that would run without executing them
#   --vault <name>    Key Vault name (default: dp-kv-deliverypilot)
#   --fly-app <name>  Fly.io app name (default: rifat-content-calendar)
#   --func-app <name> Azure Function App name (default: cc-agent-api-3ea0)
#   --rg <name>       Azure Resource Group (default: rg-deliverypilot)
#   -h, --help        Show this help message
# ==============================================================================

set -euo pipefail

# Configuration defaults
VAULT_NAME="${VAULT_NAME:-dp-kv-deliverypilot}"
FLY_APP="${FLY_APP:-rifat-content-calendar}"
FUNC_APP="${FUNC_APP:-cc-agent-api-3ea0}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-deliverypilot}"

TARGET="all"
DRY_RUN=false
SYNC_ONLY=false
VERIFY_ONLY=false

# ANSI colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}ℹ${NC} $1"; }
log_step()  { echo -e "${BLUE}▶${NC} $1"; }
log_succ()  { echo -e "${GREEN}✔${NC} $1"; }
log_warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
log_err()   { echo -e "${RED}✖${NC} $1" >&2; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      TARGET="all"
      shift
      ;;
    --site)
      TARGET="site"
      shift
      ;;
    --api)
      TARGET="api"
      shift
      ;;
    --sync-keys)
      SYNC_ONLY=true
      shift
      ;;
    --verify)
      VERIFY_ONLY=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --vault)
      VAULT_NAME="$2"
      shift 2
      ;;
    --fly-app)
      FLY_APP="$2"
      shift 2
      ;;
    --func-app)
      FUNC_APP="$2"
      shift 2
      ;;
    --rg)
      RESOURCE_GROUP="$2"
      shift 2
      ;;
    -h|--help)
      echo "Content Calendar & Delivery Pilot - Automated Deploy"
      echo ""
      echo "Usage: ./scripts/deploy.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --all             Deploy both Fly.io site and Azure Function API (default)"
      echo "  --site            Deploy only the Fly.io site (server + static pages)"
      echo "  --api             Deploy only the Azure Function API (api/)"
      echo "  --sync-keys       Sync Key Vault secrets to Fly.io & Function App without redeploying code"
      echo "  --verify          Verify access to Azure Key Vault and list secret statuses"
      echo "  --dry-run         Show what would be done without making changes"
      echo "  --vault <name>    Azure Key Vault name (default: dp-kv-deliverypilot)"
      echo "  --fly-app <name>  Fly.io app name (default: rifat-content-calendar)"
      echo "  --func-app <name> Azure Function App name (default: cc-agent-api-3ea0)"
      echo "  --rg <name>       Azure Resource Group (default: rg-deliverypilot)"
      echo "  -h, --help        Show this help message"
      exit 0
      ;;
    *)
      log_err "Unknown option: $1"
      echo "Run with --help for usage."
      exit 1
      ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${PURPLE}======================================================${NC}"
echo -e "${PURPLE}   Content Calendar Deploy with Azure Key Vault      ${NC}"
echo -e "${PURPLE}======================================================${NC}"
log_info "Repo root:       $REPO_ROOT"
log_info "Azure Key Vault: $VAULT_NAME"
log_info "Fly.io App:      $FLY_APP"
log_info "Azure Function:  $FUNC_APP"
log_info "Target:          $TARGET (Dry run: $DRY_RUN)"
echo ""

# ------------------------------------------------------------------------------
# 1. Dependency checks
# ------------------------------------------------------------------------------
log_step "Checking required tools..."

if ! command -v az >/dev/null 2>&1; then
  log_err "Azure CLI ('az') is not installed or not in PATH."
  log_info "Install with: brew install azure-cli (macOS) or see https://aka.ms/azure-cli"
  exit 1
fi

if [[ "$TARGET" != "api" ]] && ! command -v fly >/dev/null 2>&1 && ! command -v flyctl >/dev/null 2>&1; then
  log_err "Fly.io CLI ('fly') is not installed or not in PATH."
  log_info "Install with: brew install flyctl or curl -L https://fly.io/install.sh | sh"
  exit 1
fi

FLY_CMD="fly"
if ! command -v fly >/dev/null 2>&1 && command -v flyctl >/dev/null 2>&1; then
  FLY_CMD="flyctl"
fi

log_succ "Prerequisite tools verified."

# ------------------------------------------------------------------------------
# 2. Azure Login & Key Vault Access Verification
# ------------------------------------------------------------------------------
log_step "Verifying Azure authentication & Key Vault '$VAULT_NAME'..."

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "[DRY-RUN] Skipping live Azure auth and Key Vault queries."
else
  if ! az account show >/dev/null 2>&1; then
    log_err "Not logged into Azure CLI. Please run 'az login' first."
    exit 1
  fi
  AZ_SUB=$(az account show --query name -o tsv 2>/dev/null || echo "Unknown")
  log_succ "Azure logged in (Subscription: $AZ_SUB)"
fi

# List of all secrets managed in Key Vault
SECRETS=(
  "CC-ADMIN-TOKEN"
  "CC-ENTRA-CLIENT-SECRET"
  "CC-SESSION-SECRET"
  "ANTHROPIC-API-KEY"
  "DAYTONA-API-KEY"
  "github-pat"
  "CLAUDE-CODE-OAUTH-TOKEN"
  "KILO-API-KEY"
)

if [[ "$VERIFY_ONLY" == "true" ]]; then
  log_step "Verifying Azure Key Vault secrets inventory..."
  for s in "${SECRETS[@]}"; do
    if [[ "$DRY_RUN" == "true" ]]; then
      echo -e "  - ${CYAN}$s${NC}: [DRY RUN] simulated OK"
    else
      if az keyvault secret show --vault-name "$VAULT_NAME" -n "$s" --query "id" -o tsv >/dev/null 2>&1; then
        echo -e "  - ${GREEN}✔${NC} ${CYAN}$s${NC}: Present in Key Vault"
      else
        echo -e "  - ${YELLOW}⚠${NC} ${CYAN}$s${NC}: Missing or inaccessible in Key Vault"
      fi
    fi
  done
  log_succ "Verification complete."
  exit 0
fi

# Function to safely fetch a secret from Azure Key Vault
fetch_secret() {
  local name="$1"
  local optional="${2:-false}"
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "mock-secret-for-$name"
    return 0
  fi
  local val
  val=$(az keyvault secret show --vault-name "$VAULT_NAME" -n "$name" --query value -o tsv 2>/dev/null || true)
  if [[ -z "$val" ]]; then
    if [[ "$optional" == "true" ]]; then
      log_warn "Optional secret '$name' not found in vault '$VAULT_NAME'."
      echo ""
      return 0
    else
      log_err "Failed to fetch required secret '$name' from Azure Key Vault '$VAULT_NAME'."
      log_info "Make sure the secret exists and your user/identity has 'Key Vault Secrets User' role."
      exit 1
    fi
  fi
  echo "$val"
}

# ------------------------------------------------------------------------------
# 3. Fetch Keys from Azure Key Vault
# ------------------------------------------------------------------------------
log_step "Retrieving deployment secrets from Azure Key Vault '$VAULT_NAME'..."

CC_ADMIN_TOKEN=$(fetch_secret "CC-ADMIN-TOKEN")
log_succ "Retrieved CC-ADMIN-TOKEN"

CC_ENTRA_CLIENT_SECRET=$(fetch_secret "CC-ENTRA-CLIENT-SECRET" true)
if [[ -n "$CC_ENTRA_CLIENT_SECRET" ]]; then
  log_succ "Retrieved CC-ENTRA-CLIENT-SECRET"
else
  log_warn "CC-ENTRA-CLIENT-SECRET missing from vault (OIDC login might not exchange tokens)."
fi

CC_SESSION_SECRET=$(fetch_secret "CC-SESSION-SECRET" true)
if [[ -n "$CC_SESSION_SECRET" ]]; then
  log_succ "Retrieved CC-SESSION-SECRET"
else
  log_warn "CC-SESSION-SECRET missing from vault (generating fallback random string for session)."
  CC_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
fi

# ------------------------------------------------------------------------------
# 4. Sync Secrets to Fly.io
# ------------------------------------------------------------------------------
if [[ "$TARGET" == "all" || "$TARGET" == "site" || "$SYNC_ONLY" == "true" ]]; then
  log_step "Syncing Key Vault secrets to Fly.io app '$FLY_APP'..."
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] Would run: $FLY_CMD secrets set CC_ADMIN_TOKEN=*** CLIENT_SECRET=*** SESSION_SECRET=*** -a $FLY_APP"
  else
    $FLY_CMD secrets set \
      CC_ADMIN_TOKEN="$CC_ADMIN_TOKEN" \
      CLIENT_SECRET="$CC_ENTRA_CLIENT_SECRET" \
      SESSION_SECRET="$CC_SESSION_SECRET" \
      -a "$FLY_APP"
    log_succ "Fly.io secrets updated with Key Vault values."
  fi
fi

# ------------------------------------------------------------------------------
# 5. Configure Azure Function App Settings with Key Vault References
# ------------------------------------------------------------------------------
if [[ "$TARGET" == "all" || "$TARGET" == "api" || "$SYNC_ONLY" == "true" ]]; then
  log_step "Verifying Azure Function App Key Vault references..."
  KV_URI_BASE="https://${VAULT_NAME}.vault.azure.net/secrets"

  SETTINGS=(
    "ANTHROPIC_API_KEY=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/ANTHROPIC-API-KEY/)"
    "DAYTONA_API_KEY=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/DAYTONA-API-KEY/)"
    "GITHUB_PAT=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/github-pat/)"
    "CC_ADMIN_TOKEN=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/CC-ADMIN-TOKEN/)"
    "CLAUDE_CODE_OAUTH_TOKEN=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/CLAUDE-CODE-OAUTH-TOKEN/)"
    "KILO_API_KEY=@Microsoft.KeyVault(SecretUri=${KV_URI_BASE}/KILO-API-KEY/)"
  )

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] Would configure Function App settings: ${SETTINGS[*]}"
  else
    # Update Function App settings if resource group is available
    if az functionapp show -g "$RESOURCE_GROUP" -n "$FUNC_APP" >/dev/null 2>&1; then
      az functionapp config appsettings set -g "$RESOURCE_GROUP" -n "$FUNC_APP" --settings "${SETTINGS[@]}" >/dev/null
      log_succ "Azure Function App settings linked to Key Vault references."
    else
      log_warn "Function App '$FUNC_APP' not found in resource group '$RESOURCE_GROUP'. Skipping settings update."
    fi
  fi
fi

if [[ "$SYNC_ONLY" == "true" ]]; then
  log_succ "Secrets sync complete!"
  exit 0
fi

# ------------------------------------------------------------------------------
# 6. Deploy Fly.io Site
# ------------------------------------------------------------------------------
if [[ "$TARGET" == "all" || "$TARGET" == "site" ]]; then
  log_step "Deploying static site + proxy to Fly.io ($FLY_APP)..."
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] Would run: $FLY_CMD deploy -a $FLY_APP --remote-only"
  else
    $FLY_CMD deploy -a "$FLY_APP" --remote-only
    log_succ "Fly.io deployment finished successfully!"
  fi
fi

# ------------------------------------------------------------------------------
# 7. Deploy Azure Function API
# ------------------------------------------------------------------------------
if [[ "$TARGET" == "all" || "$TARGET" == "api" ]]; then
  log_step "Packaging and deploying Azure Function API ($FUNC_APP)..."
  ZIP_PATH="/tmp/cc-agent-api-$$.zip"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "[DRY-RUN] Would package api/ into $ZIP_PATH and run: az functionapp deployment source config-zip -g $RESOURCE_GROUP -n $FUNC_APP --src $ZIP_PATH --build-remote true"
  else
    if [[ -d "api" ]]; then
      # Create clean zip excluding node_modules, tests, local settings
      (
        cd api
        zip -q -r "$ZIP_PATH" . -x "node_modules/*" "test/*" "local.settings.json" "*.zip"
      )
      log_info "Packaged api/ -> $ZIP_PATH ($(du -h "$ZIP_PATH" | cut -f1))"

      if az functionapp show -g "$RESOURCE_GROUP" -n "$FUNC_APP" >/dev/null 2>&1; then
        az functionapp deployment source config-zip -g "$RESOURCE_GROUP" -n "$FUNC_APP" --src "$ZIP_PATH" --build-remote true
        log_succ "Azure Function App deployed successfully!"
      else
        log_warn "Function App '$FUNC_APP' in '$RESOURCE_GROUP' not found. Skipping zip upload."
      fi
      rm -f "$ZIP_PATH"
    else
      log_warn "Directory 'api' not found. Skipping API deployment."
    fi
  fi
fi

echo ""
echo -e "${GREEN}======================================================${NC}"
echo -e "${GREEN}   Deployment Completed Successfully!                 ${NC}"
echo -e "${GREEN}======================================================${NC}"
log_info "Fly.io site:      https://${FLY_APP}.fly.dev"
log_info "Key Vault used:   ${VAULT_NAME}"
log_info "Search feature:   Live on menu (⌘K / /)"
