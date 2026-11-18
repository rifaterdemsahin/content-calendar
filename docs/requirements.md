# Requirements

Scope: the Content Engine dashboard, the notes widget and the Daytona-backed Claude chat agent (`api/`).
Live page for the Key Vault requirements: `key-vault.html` (also linked from the dashboard header).

Status values: **Implemented** (declared in this repo), **Operational** (done in Azure, not visible in this repo, verify), **Proposed** (not built).

## 1. Secrets & Azure Key Vault

Vault: `dp-kv-deliverypilot` (`https://dp-kv-deliverypilot.vault.azure.net`, UK South).

| ID | Requirement | Status |
| :--- | :--- | :--- |
| KV-1 | All server-side secrets live in Azure Key Vault `dp-kv-deliverypilot`. None are committed to the repo, `index.html`, or `assets/`. | Implemented (README, `api/`) |
| KV-2 | The Function App reads secrets through Key Vault references in app settings (`@Microsoft.KeyVault(SecretUri=...)`), so code only sees ordinary environment variables. | Implemented (code reads `process.env.*`) |
| KV-3 | The Function App authenticates to the vault with a managed identity holding the `Key Vault Secrets User` role (RBAC). No client secrets, no vault keys. | Operational, verify |
| KV-4 | Secret names use hyphens as Key Vault requires; each maps to exactly one app setting (see the mapping table below). | Implemented |
| KV-5 | The only secret a browser ever holds is the `CC_ADMIN_TOKEN` access token, pasted once by the owner and kept in `localStorage`. Every API call sends it as `x-cc-token` and the server compares it in constant time. | Implemented (`assets/cc-widget.js`, `api/src/lib/auth.js`) |
| KV-6 | The API fails closed: if `CC_ADMIN_TOKEN` is unset the API answers 503, and a wrong or missing token answers 401. | Implemented (`api/src/lib/auth.js`) |
| KV-7 | Error messages that could contain a token are redacted before being stored or returned. | Implemented (`api/src/lib/runAgent.js` masks `GITHUB_PAT`) |
| KV-8 | Soft-delete and purge protection are enabled on the vault. | Operational, verify |
| KV-9 | Diagnostic settings send vault audit logs to a Log Analytics workspace. | Proposed |
| KV-10 | Every secret has an expiry date, and the owner rotates `github-pat`, `DAYTONA-API-KEY`, `ANTHROPIC-API-KEY` and `CC-ADMIN-TOKEN` at least every 90 days. | Proposed |
| KV-11 | The GitHub PAT is fine-grained, limited to `rifaterdemsahin/content-calendar`, with only contents and pull-request write. | Operational, verify |
| KV-12 | A `YOUTUBE-API-KEY` secret (public Data API) lets the stats scripts read subscriber counts, since the current scripts only scrape the RSS feed and have no subscriber source. | Proposed |

### Secret → app setting mapping

| Key Vault secret | App setting (env var) | Used by |
| :--- | :--- | :--- |
| `ANTHROPIC-API-KEY` | `ANTHROPIC_API_KEY` | `api/src/lib/runAgent.js`: passed into the Daytona sandbox so the Claude agent can run |
| `DAYTONA-API-KEY` | `DAYTONA_API_KEY` | `api/src/lib/runAgent.js`: creates the sandbox |
| `github-pat` | `GITHUB_PAT` | `api/src/lib/runAgent.js`: clones the repo, pushes the branch, opens the PR |
| `CC-ADMIN-TOKEN` | `CC_ADMIN_TOKEN` | `api/src/lib/auth.js`: guards the notes and chat endpoints |

App-setting value format:

```
@Microsoft.KeyVault(SecretUri=https://dp-kv-deliverypilot.vault.azure.net/secrets/<SECRET-NAME>/)
```

## 2. Runbook

Get the admin token for the dashboard widget:

```bash
az keyvault secret show --vault-name dp-kv-deliverypilot -n CC-ADMIN-TOKEN --query value -o tsv
```

Check the Function App resolves its references (each shows `Resolved`):

```bash
az webapp config appsettings list -g <resource-group> -n <function-app> \
  --query "[?contains(value,'KeyVault')].name" -o tsv
# Portal: Function App > Environment variables > "Key vault reference" status column
```

Grant the identity access (KV-3):

```bash
az functionapp identity assign -g <resource-group> -n <function-app>
az role assignment create --assignee <principalId> --role "Key Vault Secrets User" \
  --scope $(az keyvault show -n dp-kv-deliverypilot --query id -o tsv)
```

Rotate a secret: set a new version (`az keyvault secret set --vault-name dp-kv-deliverypilot -n <name> --value ...`). Key Vault references pick up the new version automatically within about a day; restart the Function App to force it. For `CC-ADMIN-TOKEN`, paste the new token into the widget again.

## 3. Known gaps

- This repo does not contain infrastructure-as-code, so KV-3, KV-8 and KV-11 can't be proven from the repository. Verify them in Azure.
- `localStorage` holds the admin token (KV-5), so any XSS on the Pages origin would expose it. The widget should keep escaping note content, and the token should be rotated if the page is ever compromised.
- A coding-agent session I ran on Nov 18 2026 could reach the vault network endpoint, but its injected Azure token had expired (`TokenExpired`), so no vault contents were read or verified.
