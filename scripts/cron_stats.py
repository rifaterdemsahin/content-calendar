#!/usr/bin/env python3
"""Scheduled job (runs on Fly.io): pull channel stats, compute them, save them to Azure storage.

Writes two blobs in the Azure "content" container:
  stats/stats.json       the latest stats (read by GET /api/stats)
  stats/job-status.json  the live run status and the last 20 runs (read by GET /api/job-status)

Secrets (set on the Fly job app, never in the repo):
  YOUTUBE_API_KEY                 YouTube Data API v3 key
  AZURE_STORAGE_CONNECTION_STRING storage account connection string
Optional: CONTENT_CONTAINER (default "content").

Local run without Azure, writing data/studio/stats.json and data/studio/job-status.json:
  python3 scripts/cron_stats.py --local
"""
import datetime as dt
import json
import os
import pathlib
import sys
import traceback

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pull_youtube_stats as yt  # noqa: E402
import studio_stats as ss  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
KEEP_RUNS = 20


def now():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Store:
    """Reads and writes JSON blobs in Azure, or local files with --local."""

    def __init__(self, local):
        self.local = local
        if local:
            self.dir = ROOT / "data" / "studio"
        else:
            conn = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
            if not conn:
                sys.exit("AZURE_STORAGE_CONNECTION_STRING is not set")
            from azure.storage.blob import BlobServiceClient  # installed in the job image
            self.container = BlobServiceClient.from_connection_string(conn).get_container_client(
                os.environ.get("CONTENT_CONTAINER", "content"))

    def read(self, name):
        if self.local:
            p = self.dir / name.split("/")[-1]
            return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None
        from azure.core.exceptions import ResourceNotFoundError
        try:
            return json.loads(self.container.get_blob_client(name).download_blob().readall())
        except ResourceNotFoundError:
            return None

    def write(self, name, obj):
        payload = json.dumps(obj, indent=2, ensure_ascii=False)
        if self.local:
            (self.dir / name.split("/")[-1]).write_text(payload, encoding="utf-8")
            return
        from azure.storage.blob import ContentSettings
        self.container.get_blob_client(name).upload_blob(
            payload.encode("utf-8"), overwrite=True,
            content_settings=ContentSettings(content_type="application/json; charset=utf-8"))


def main():
    local = "--local" in sys.argv
    store = Store(local)
    run = {"state": "running", "step": "starting", "progress": 0, "startedAt": now(), "updatedAt": now()}
    history = (store.read("stats/job-status.json") or {}).get("runs", [])

    def publish(**fields):
        run.update(fields, updatedAt=now())
        store.write("stats/job-status.json", {"current": run, "runs": history[-KEEP_RUNS:]})

    publish()
    try:
        def progress(step, done, total):
            pct = int(100 * done / total) if total else 0
            publish(step=f"{step}: {done} of {total}", progress=pct)

        publish(step="fetching the video list", progress=5)
        videos = yt.pull_videos(progress=progress)

        publish(step="computing stats", progress=95)
        snap = dt.date.today().isoformat()
        stats = ss.summarise(videos, snap)
        stats["source"] = "YouTube Data API v3 (scheduled job)"
        stats["generatedAt"] = now()
        store.write("stats/stats.json", stats)

        run.update(state="ok", step="done", progress=100, finishedAt=now(), videos=stats["videos"], totalViews=stats["totalViews"])
        history.append({k: run[k] for k in ("state", "startedAt", "finishedAt", "videos", "totalViews")})
        publish()
        print(f"saved stats: {stats['videos']} videos, {stats['totalViews']} views")
        return 0
    except Exception as e:  # record the failure, then re-raise so Fly shows the run as failed
        run.update(state="error", step="failed", finishedAt=now(), error=f"{type(e).__name__}: {e}")
        history.append({k: run.get(k) for k in ("state", "startedAt", "finishedAt", "error")})
        publish()
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
