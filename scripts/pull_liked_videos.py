#!/usr/bin/env python3
"""Pull the videos Erdem liked on YouTube into data/liked-videos.json.

Liked videos are private, so an API key is not enough. This needs an OAuth
access token with the youtube.readonly scope (never commit it):
    export YOUTUBE_OAUTH_TOKEN=...
    python3 scripts/pull_liked_videos.py [--limit 50]
"""
import argparse, json, os, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--output", default="data/liked-videos.json")
    a = ap.parse_args()
    tok = os.environ.get("YOUTUBE_OAUTH_TOKEN")
    if not tok:
        sys.exit("YOUTUBE_OAUTH_TOKEN is not set (OAuth, youtube.readonly). Liked videos are private.")
    q = urllib.parse.urlencode({"part": "snippet", "myRating": "like", "maxResults": min(a.limit, 50)})
    req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?" + q.replace("snippet", "snippet,statistics", 1),
                                 headers={"Authorization": "Bearer " + tok})
    with urllib.request.urlopen(req, timeout=20) as r:
        items = json.load(r).get("items", [])
    videos = [{
        "id": i["id"], "title": i["snippet"]["title"], "channel": i["snippet"]["channelTitle"],
        "published": i["snippet"]["publishedAt"][:10],
        "views": int(i.get("statistics", {}).get("viewCount", 0)),
        "url": "https://www.youtube.com/watch?v=" + i["id"],
    } for i in items[:a.limit]]
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "status": "ok", "videos": videos}
    with open(a.output, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
    print(f"Wrote {len(videos)} liked videos to {a.output}")

if __name__ == "__main__":
    main()
