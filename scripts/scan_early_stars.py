#!/usr/bin/env python3
"""
scan_early_stars.py
Find "early stars" in the AI niche: small channels whose video got far more views than the
channel has subscribers (views / subs >= 5 is a star). Results go to data/early-stars.json.

No API key needed: it reads public YouTube search and watch pages. Numbers are a snapshot taken
on the scan date; the page shows that date.

Usage:
    python3 scripts/scan_early_stars.py                      # search the queries in the data file
    python3 scripts/scan_early_stars.py --max-new 30         # look at up to 30 new videos
    python3 scripts/scan_early_stars.py --add URL [URL ...]  # add specific videos by link
    python3 scripts/scan_early_stars.py --refresh            # re-read numbers of saved videos
"""
import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data" / "early-stars.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
THIS_MONTH_VIDEOS = "EgQIBBAB"  # YouTube search filter: uploaded this month


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", "Cookie": "CONSENT=YES+1"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="ignore")


def video_id(s):
    m = re.search(r"(?:v=|youtu\.be/|shorts/|live/|embed/)([\w-]{11})", s) or re.fullmatch(r"([\w-]{11})", s.strip())
    return m.group(1) if m else None


def parse_subs(text):
    """'4.05 thousand subscribers' -> 4050"""
    m = re.search(r"([\d.,]+)\s*(thousand|million|billion|K|M|B)?\s*subscribers", text, re.I)
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    mult = {"thousand": 1e3, "k": 1e3, "million": 1e6, "m": 1e6, "billion": 1e9, "b": 1e9}.get((m.group(2) or "").lower(), 1)
    return int(round(n * mult))


def read_video(vid):
    """Public numbers for one video, or None if they can't be read."""
    html = get(f"https://www.youtube.com/watch?v={vid}")
    views = re.search(r'"viewCount":"([\d,]+)"', html)
    subs = re.search(r'"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"', html)
    when = re.search(r'"dateText":\{"simpleText":"([A-Za-z]{3} \d{1,2}, \d{4})"', html)
    if not (views and subs):
        return None
    s = parse_subs(subs.group(1))
    if not s:
        return None
    # title and channel come from the oEmbed endpoint (stable, no key)
    o = json.loads(get("https://www.youtube.com/oembed?format=json&url=" + urllib.parse.quote(f"https://www.youtube.com/watch?v={vid}", safe="")))
    published = ""
    if when:
        try:
            published = datetime.strptime(when.group(1), "%b %d, %Y").date().isoformat()
        except ValueError:
            pass
    return {
        "id": vid,
        "title": o.get("title", vid),
        "channel": o.get("author_name", ""),
        "channelUrl": o.get("author_url", ""),
        "subs": s,
        "views": int(views.group(1).replace(",", "")),
        "published": published,
    }


def search(query):
    html = get("https://www.youtube.com/results?search_query=" + urllib.parse.quote_plus(query) + "&sp=" + THIS_MONTH_VIDEOS)
    seen, out = set(), []
    for v in re.findall(r'"videoId":"([\w-]{11})"', html):
        if v not in seen:
            seen.add(v); out.append(v)
    return out


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))


def save(d):
    d["videos"].sort(key=lambda v: v["views"] / max(v["subs"], 1), reverse=True)
    DATA.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def keep(v, c):
    return v["subs"] <= c["maxSubs"] and v["views"] >= c["minViews"] and v["views"] / v["subs"] >= c["minRatio"]


def merge(d, info, today, how):
    old = next((x for x in d["videos"] if x["id"] == info["id"]), None)
    if old:  # refresh numbers, keep the person's notes and status
        old.update({k: info[k] for k in ("title", "channel", "channelUrl", "subs", "views", "published")})
        old["checked"] = today
        return "updated"
    d["videos"].append({**info, "status": "To watch", "idea": "", "found": today, "checked": today, "via": how})
    return "added"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--add", nargs="*", help="video links to add (kept even if below the thresholds)")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--max-new", type=int, default=60, help="max new videos to read per scan")
    a = ap.parse_args()

    d, today = load(), date.today().isoformat()
    c = d["criteria"]
    known = {v["id"] for v in d["videos"]}
    log = []

    if a.add:
        for link in a.add:
            vid = video_id(link)
            info = read_video(vid) if vid else None
            if not info:
                print(f"could not read {link}", file=sys.stderr); continue
            log.append(f"{merge(d, info, today, 'manual')}: {info['channel']} · {info['views']:,} views / {info['subs']:,} subs")
    elif a.refresh:
        for v in list(d["videos"]):
            info = read_video(v["id"])
            if info:
                merge(d, info, today, v.get("via", "scan")); time.sleep(0.5)
    else:
        fresh = []
        for q in d["queries"]:
            try:
                for vid in search(q):
                    if vid not in known and vid not in fresh:
                        fresh.append(vid)
            except Exception as e:
                print(f"search failed for {q!r}: {e}", file=sys.stderr)
            time.sleep(0.5)
        for vid in fresh[: a.max_new]:
            try:
                info = read_video(vid)
            except Exception as e:
                print(f"skip {vid}: {e}", file=sys.stderr); continue
            time.sleep(0.5)
            if info and keep(info, c):
                log.append(f"{merge(d, info, today, 'scan')}: {info['channel']} · {info['views']:,} views / {info['subs']:,} subs")
        d["lastScan"] = today
        d["lastScanLooked"] = min(len(fresh), a.max_new)

    d["updated"] = today
    save(d)
    print("\n".join(log) or "nothing new")


if __name__ == "__main__":
    main()
