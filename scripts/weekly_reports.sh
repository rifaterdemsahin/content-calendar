#!/usr/bin/env bash
# Weekly report refresh: pull the latest videos and stats that feed the Reports menu
#   week.html         Weekly Direction Report   (data/videos.json + data/week-review.json)
#   performance.html  Channel Performance Report (data/past-performance.json + data/performance-insights.json)
#   what-works.html   What works / What doesn't  (data/what-works.json; views computed live)
# Run at least once a week (Mondays). After it runs, rewrite the judgment files
# data/week-review.json, data/performance-insights.json and data/what-works.json from the new numbers,
# then commit straight to main (trunk-based) and push.
# Usage: scripts/weekly_reports.sh
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/fetch_latest_videos.py --format json --output data/latest-videos.json --limit 15
python3 scripts/fetch_latest_videos.py --format markdown --output data/latest-videos.md --limit 15
python3 scripts/analyze_past_performance.py

# Full per-video stats need a YouTube Data API key; skip quietly without one.
if [ -n "${YOUTUBE_API_KEY:-}" ]; then
  python3 scripts/pull_youtube_stats.py
fi
python3 scripts/studio_stats.py
python3 scripts/build_guide.py

python3 scripts/validate-dates.py >/dev/null
python3 -m unittest discover -s tests -q
echo "Data refreshed $(date -u +%Y-%m-%dT%H:%M:%SZ). Next: update data/week-review.json, data/performance-insights.json and data/what-works.json."
