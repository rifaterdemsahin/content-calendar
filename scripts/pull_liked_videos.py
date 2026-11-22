#!/usr/bin/env python3
"""Pull the videos Erdem liked on YouTube into data/liked-videos.json.

Liked videos are private, so an API key is not enough. This needs an OAuth
access token with the youtube.readonly scope (never commit it):
    export YOUTUBE_OAUTH_TOKEN=...
    python3 scripts/pull_liked_videos.py [--limit 50]
"""
import argparse, json, os, re, sys, urllib.request, urllib.parse
from datetime import datetime, timezone

# First matching keyword wins. Edit freely; unmatched videos land in "Other".
CATEGORIES = [
    ("🤖 AI & agents", ["ai", "claude", "gpt", "llm", "agent", "copilot", "gemini", "openai", "cursor"]),
    ("🛠️ Dev tooling", ["code", "coding", "developer", "github", "docker", "python", "javascript", "api", "devops", "azure", "terminal"]),
    ("💼 Career & industry", ["career", "job", "salary", "hiring", "interview", "layoff", "industry"]),
    ("📈 Business & creator", ["youtube", "creator", "channel", "audience", "business", "marketing", "startup", "grow", "money"]),
    ("🧠 Mindset & learning", ["mindset", "habit", "learn", "productivity", "focus", "discipline"]),
    ("🎵 Music & fun", ["music", "song", "official video", "live", "funny", "comedy"]),
]

def categorize(text):
    words = set(re.findall(r"[a-z0-9]+", text.lower()))
    low = text.lower()
    for name, keys in CATEGORIES:
        if any((k in words) if " " not in k else (k in low) for k in keys):
            return name
    return "📦 Other"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=500)
    ap.add_argument("--output", default="data/liked-videos.json")
    a = ap.parse_args()
    tok = os.environ.get("YOUTUBE_OAUTH_TOKEN")
    if not tok:
        sys.exit("YOUTUBE_OAUTH_TOKEN is not set (OAuth, youtube.readonly). Liked videos are private.")
    items, page = [], None
    while len(items) < a.limit:
        params = {"part": "snippet,statistics", "myRating": "like", "maxResults": min(a.limit - len(items), 50)}
        if page: params["pageToken"] = page
        req = urllib.request.Request("https://www.googleapis.com/youtube/v3/videos?" + urllib.parse.urlencode(params),
                                     headers={"Authorization": "Bearer " + tok})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
        items += data.get("items", [])
        page = data.get("nextPageToken")
        if not page: break
    videos = [{
        "id": i["id"], "title": i["snippet"]["title"], "channel": i["snippet"]["channelTitle"],
        "published": i["snippet"]["publishedAt"][:10],
        "views": int(i.get("statistics", {}).get("viewCount", 0)),
        "url": "https://www.youtube.com/watch?v=" + i["id"],
        "category": categorize(i["snippet"]["title"] + " " + i["snippet"].get("description", "")[:300]),
    } for i in items[:a.limit]]
    out = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "status": "ok", "videos": videos}
    with open(a.output, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False); f.write("\n")
    print(f"Wrote {len(videos)} liked videos to {a.output}")

if __name__ == "__main__":
    main()
