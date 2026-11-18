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
| `CC-ADMIN-TOKEN` | `CC_ADMIN_TOKEN` | `api/src/lib/auth.js`: guards the notes and chat endpoints; passed from Fly proxy |
| `CC-ENTRA-CLIENT-SECRET` | `CLIENT_SECRET` | `server/server.js`: Microsoft Entra OIDC OAuth exchange on Fly.io |
| `CC-SESSION-SECRET` | `SESSION_SECRET` | `server/session.js`: HMAC signing for user session cookies on Fly.io |
| `CLAUDE-CODE-OAUTH-TOKEN` | `CLAUDE_CODE_OAUTH_TOKEN` | `api/src/lib/runAgent.js`: Claude Code Pro/Team subscription token for sandbox |
| `KILO-API-KEY` | `KILO_API_KEY` | Data & search enrichment |

App-setting value format:

```
@Microsoft.KeyVault(SecretUri=https://dp-kv-deliverypilot.vault.azure.net/secrets/<SECRET-NAME>/)
```

## 2. Runbook

Automated deploy with Azure Key Vault secrets:

```bash
# Sync secrets from Key Vault to Fly.io & deploy both site + API
./scripts/deploy.sh --all

# Or check what will be executed
./scripts/deploy.sh --dry-run
```

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

## 4. What Claude needs to guide the calendar

Without these inputs the advice rests on a Nov 17 scrape (public view counts only). Priority: **P0** unlocks the biggest decisions, **P1** sharpens them, **P2** is nice to have. Live page: `requirements.html`.

| ID | Need | Why it matters | How to provide | Pri |
| :--- | :--- | :--- | :--- | :--- |
| IN-1 | **Network access to YouTube** (`www.youtube.com`, `www.googleapis.com`, `youtubeanalytics.googleapis.com`) from the cloud session | The scripts and the live check were blocked (403 on `www.youtube.com`), so numbers go stale | Add the exact hosts to the environment's network allowlist | P0 |
| IN-2 | **YouTube Studio exports**: last 365 days of channel and per-video analytics (watch hours, subscribers gained, impressions, CTR, average view duration, traffic sources) | The YPP plan hinges on 4,000 watch hours and 1,000 subs, and neither is in the repo today | Drop CSVs in `data/studio/` (see `data/studio/README.md`) | P0 |
| IN-3 | **Valid Azure Key Vault access** for the session | The vault token expired, so nothing in the vault can be verified | Refresh the connection for `dp-kv-deliverypilot` | P0 |
| IN-4 | **YouTube Data API key**, stored as `YOUTUBE-API-KEY` in Key Vault | Automatic subscriber and view counts, no scraping | Create in Google Cloud, then `az keyvault secret set`; or give it to the session through the secure credential form, never in chat | P1 |
| IN-5 | **YouTube Analytics OAuth** (read-only scope `yt-analytics.readonly`): client id, secret, refresh token as `YOUTUBE-OAUTH-*` secrets | Watch hours, CTR and retention are only available through the Analytics API, and not through the Data API key | One-time consent flow; store in Key Vault | P2 (CSV exports cover it) |
| IN-6 | **Skool numbers**: members (free and paid), weekly active, post engagement, where new members came from | The funnel can't be scored. Skool has no public API, so this is manual or via export | Weekly row in `data/studio/skool-weekly.csv` | P1 |
| IN-7 | **Real production log**: hours spent per week, what was recorded vs published, and what slipped | The 10.5 hr/week cap and the cadence are assumptions. Output was 2/week in Aug–Sep, then a 8-week gap | Update `calendar/weekly-production-tracker.md` each week | P0 |
| IN-8 | **Your constraints and goals**: hours per week you can really give, revenue target and date, whether the Saturday live and masterclass stay | Sizing the plan to what you will actually do | Answer in chat or edit `okrs/` | P0 |
| IN-9 | **Google Calendar connector** (already connected to this session) | Block the shoot and edit sessions on your real calendar so the plan competes with real commitments | Tell me to schedule it | P2 |
| IN-10 | **Permission to land changes on `main`** | GitHub Pages deploys only from `main`; my work goes to the `claude/*` branch | Say "merge to main" or ask for a PR | P0 for deploys |

Code that is proposed once the inputs exist: a stats script that reads `data/studio/` and `YOUTUBE-API-KEY` (replacing the hardcoded 725 subs), a scheduled GitHub Action that refreshes `data/`, and a tracker check that flags weeks behind plan. The calendar's dates are two days ahead of their weekday labels, and fixing them needs one decision from you (IN-8): which real Monday should Week 1 start on.

Never paste keys into chat. Put them in Key Vault, or use the session's secure credential form.
