#!/usr/bin/env python3
"""Scheduled job (runs on Fly.io): pull channel stats, compute them, save to Azure storage.

Secrets it needs (set on the Fly job app, never in the repo):
  YOUTUBE_API_KEY                 YouTube Data API v3 key
  AZURE_STORAGE_CONNECTION_STRING storage account connection string (same account as the function app)
Optional:
  CONTENT_CONTAINER               default "content"
  STATS_BLOB                      default "stats/stats.json"

The Azure function GET /api/stats reads that blob, and the on-track page draws from it.
Run locally without Azure, writing data/studio/stats.json instead:  python3 scripts/cron_stats.py --local
"""
import datetime as dt
import json
import os
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pull_youtube_stats as yt  # noqa: E402
import studio_stats as ss  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    local = "--local" in sys.argv
    videos = yt.pull_videos()
    snap = dt.date.today().isoformat()
    stats = ss.summarise(videos, snap)
    stats["source"] = "YouTube Data API v3 (scheduled job)"
    stats["generatedAt"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = json.dumps(stats, indent=2, ensure_ascii=False)

    if local:
        out = ROOT / "data" / "studio" / "stats.json"
        out.write_text(payload, encoding="utf-8")
        print(f"wrote {out.relative_to(ROOT)} ({stats['videos']} videos)")
        return 0

    conn = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not conn:
        sys.exit("AZURE_STORAGE_CONNECTION_STRING is not set")
    from azure.storage.blob import BlobServiceClient, ContentSettings  # installed in the job image
    container = os.environ.get("CONTENT_CONTAINER", "content")
    blob = os.environ.get("STATS_BLOB", "stats/stats.json")
    client = BlobServiceClient.from_connection_string(conn).get_container_client(container)
    client.get_blob_client(blob).upload_blob(
        payload.encode("utf-8"), overwrite=True,
        content_settings=ContentSettings(content_type="application/json; charset=utf-8"))
    print(f"saved {container}/{blob}: {stats['videos']} videos, {stats['totalViews']} views")
    return 0


if __name__ == "__main__":
    sys.exit(main())
