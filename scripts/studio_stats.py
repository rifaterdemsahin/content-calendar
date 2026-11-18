#!/usr/bin/env python3
"""Turn a YouTube Studio snapshot into stats for the analytics page.

Reads  data/studio/studio-snapshot-*.json   (latest by name)
Writes data/studio/stats.json

Usage: python3 scripts/studio_stats.py [snapshot.json]
"""
import datetime as dt
import glob
import json
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
STUDIO = ROOT / "data" / "studio"


def secs(duration):
    if not duration:
        return None
    parts = [int(p) for p in duration.split(":")]
    total = 0
    for p in parts:
        total = total * 60 + p
    return total


def summarise(videos, snap_date):
    views = [v["views"] for v in videos]
    total = sum(views)
    n = len(videos)
    comments = sum(v["comments"] for v in videos)

    def block(vs):
        vv = [v["views"] for v in vs]
        return {
            "videos": len(vs),
            "views": sum(vv),
            "avgViews": round(sum(vv) / len(vv), 1) if vv else 0,
            "medianViews": statistics.median(vv) if vv else 0,
        }

    by_year = {}
    for y in sorted({v["date"][:4] for v in videos}):
        by_year[y] = block([v for v in videos if v["date"][:4] == y])

    shorts = [v for v in videos if secs(v.get("duration")) is not None and secs(v["duration"]) <= 60]
    longs = [v for v in videos if secs(v.get("duration")) is not None and secs(v["duration"]) > 60]
    recent_cut = (dt.date.fromisoformat(snap_date) - dt.timedelta(days=90)).isoformat()
    recent = [v for v in videos if v["date"] >= recent_cut]

    by_month = {}
    for m in sorted({v["date"][:7] for v in videos}):
        by_month[m] = block([v for v in videos if v["date"][:7] == m])
    top = sorted(videos, key=lambda v: -v["views"])[:5]
    return {
        "snapshotDate": snap_date,
        "videos": n,
        "totalViews": total,
        "avgViewsPerVideo": round(total / n, 1) if n else 0,
        "medianViewsPerVideo": statistics.median(views) if views else 0,
        "totalComments": comments,
        "commentsPer100Views": round(100 * comments / total, 2) if total else 0,
        "longVideos": block(longs),
        "shorts": block(shorts),
        "unknownLength": block([v for v in videos if secs(v.get("duration")) is None]),
        "last90Days": {**block(recent), "since": recent_cut},
        "byYear": by_year,
        "byMonth": by_month,
        "abTests": {
            "running": sum(1 for v in videos if v.get("abTest") == "running"),
            "completed": sum(1 for v in videos if v.get("abTest") == "completed"),
        },
        "top5": [{"title": v["title"], "views": v["views"], "date": v["date"]} for v in top],
        "notes": [
            "Lifetime views as shown by YouTube Studio; no watch hours or CTR in this export.",
            "Shorts are not labelled in the export: 60 seconds or less is counted as a Short.",
        ],
    }


def main():
    if len(sys.argv) > 1:
        src = pathlib.Path(sys.argv[1])
    else:
        found = sorted(glob.glob(str(STUDIO / "studio-snapshot-*.json")))
        if not found:
            print("no studio-snapshot-*.json found")
            return 1
        src = pathlib.Path(found[-1])
    snap = json.loads(src.read_text(encoding="utf-8"))
    stats = summarise(snap["videos"], snap["snapshotDate"])
    stats["source"] = src.name
    out = STUDIO / "stats.json"
    out.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}: {stats['videos']} videos, {stats['totalViews']} views, avg {stats['avgViewsPerVideo']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
