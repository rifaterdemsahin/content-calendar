#!/usr/bin/env python3
"""Pull public stats for every upload on the channel with the YouTube Data API v3.

Needs a key in the environment (never commit it):
    export YOUTUBE_API_KEY=...        # created in Google Cloud, see requirements IN-4
Writes data/studio/youtube-api-<date>.json in the same shape as the Studio snapshot,
so scripts/studio_stats.py can read it.

Usage: YOUTUBE_API_KEY=... python3 scripts/pull_youtube_stats.py
"""
import datetime as dt
import json
import os
import pathlib
import re
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHANNEL_ID = "UCSJyG3bTM7lnjMIZcV8C4OQ"  # @RifatErdemSahin (data/latest-videos.json)
API = "https://www.googleapis.com/youtube/v3"


def get(endpoint, **params):
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        sys.exit("YOUTUBE_API_KEY is not set. Create a key in Google Cloud and export it.")
    params["key"] = key
    url = f"{API}/{endpoint}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def iso_duration_to_clock(s):
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", s or "")
    if not m:
        return ""
    h, mi, se = (int(x) if x else 0 for x in m.groups())
    total = h * 3600 + mi * 60 + se
    return f"{total // 3600}:{(total % 3600) // 60:02d}:{total % 60:02d}" if h else f"{total // 60}:{total % 60:02d}"


def uploads_playlist(channel_id):
    # Every channel's uploads playlist id is the channel id with "UC" replaced by "UU".
    return "UU" + channel_id[2:]


def main():
    ids, page = [], None
    while True:
        params = dict(part="contentDetails", playlistId=uploads_playlist(CHANNEL_ID), maxResults=50)
        if page:
            params["pageToken"] = page
        data = get("playlistItems", **params)
        ids += [it["contentDetails"]["videoId"] for it in data.get("items", [])]
        page = data.get("nextPageToken")
        if not page:
            break

    videos = []
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        data = get("videos", part="snippet,statistics,contentDetails", id=",".join(chunk))
        for it in data.get("items", []):
            st, sn, cd = it.get("statistics", {}), it["snippet"], it["contentDetails"]
            videos.append({
                "title": sn["title"],
                "duration": iso_duration_to_clock(cd.get("duration")),
                "date": sn["publishedAt"][:10],
                "visibility": "Public",
                "published": "Published",
                "views": int(st.get("viewCount", 0)),
                "comments": int(st.get("commentCount", 0)),
                "likes": int(st.get("likeCount", 0)) if "likeCount" in st else None,
                "abTest": None,
                "videoId": it["id"],
            })

    today = dt.date.today().isoformat()
    out = {
        "source": "YouTube Data API v3 (public stats). No watch hours or CTR here; those need the Studio export or YouTube Analytics API.",
        "snapshotDate": today,
        "channel": "@RifatErdemSahin",
        "videos": sorted(videos, key=lambda v: v["date"], reverse=True),
    }
    path = ROOT / "data" / "studio" / f"youtube-api-{today}.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}: {len(videos)} videos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
