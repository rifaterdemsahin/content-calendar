#!/usr/bin/env bash
# Ship: stamp the deploy time, commit, push to main, deploy to Fly.io, and check the site is up.
# Usage: scripts/ship.sh "commit message"
set -euo pipefail
cd "$(dirname "$0")/.."
# Guard: refuse to ship if any date and weekday pair disagrees with the calendar.
python3 scripts/validate-dates.py || { echo "date check failed: fix the weekdays before shipping"; exit 1; }
MSG="${1:-chore: ship}"
STAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '{\n  "deployedAt": "%s"\n}\n' "$STAMP" > data/deploy.json
git add -A
git commit -q -m "$MSG

Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>" || echo "nothing new to commit"
git pull --rebase -q origin main
git push -q origin main
fly deploy --remote-only
curl -fs -o /dev/null -w "healthz %{http_code}\n" https://rifat-content-calendar.fly.dev/healthz
