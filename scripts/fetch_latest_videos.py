#!/usr/bin/env python3
"""
fetch_latest_videos.py
Fetch the latest released videos from the YouTube channel @RifatErdemSahin.
Uses the official YouTube RSS/Atom feed (no API key required).

Usage:
    python3 scripts/fetch_latest_videos.py
    python3 scripts/fetch_latest_videos.py --limit 10 --format markdown
    python3 scripts/fetch_latest_videos.py --format json --output data/latest-videos.json
"""

import argparse
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime

DEFAULT_CHANNEL_ID = "UCSJyG3bTM7lnjMIZcV8C4OQ"
DEFAULT_HANDLE = "@RifatErdemSahin"
RSS_FEED_URL = f"https://www.youtube.com/feeds/videos.xml?channel_id={DEFAULT_CHANNEL_ID}"

ATOM_NS = {
    'atom': 'http://www.w3.org/2005/Atom',
    'yt': 'http://www.youtube.com/xml/schemas/2015',
    'media': 'http://search.yahoo.com/mrss/'
}

def resolve_channel_id(handle: str) -> str:
    """Resolve a YouTube handle (e.g., @RifatErdemSahin) to its channel ID."""
    clean_handle = handle if handle.startswith('@') else f"@{handle}"
    url = f"https://www.youtube.com/{clean_handle}"
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            matches = re.findall(r'\"channelId\":\"([a-zA-Z0-9_-]{20,})\"', html)
            if not matches:
                matches = re.findall(r'channel_id=([a-zA-Z0-9_-]{20,})', html)
            if matches:
                return matches[0]
    except Exception as e:
        print(f"Warning: Could not dynamically resolve handle {handle}: {e}", file=sys.stderr)
    return DEFAULT_CHANNEL_ID

def fetch_videos(channel_id: str, limit: int = 15):
    """Fetch and parse latest videos from the channel's Atom RSS feed."""
    feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    req = urllib.request.Request(
        feed_url,
        headers={'User-Agent': 'Mozilla/5.0 (compatible; ContentCalendarBot/1.0)'}
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching RSS feed: {e}", file=sys.stderr)
        return []

    root = ET.fromstring(xml_data)
    entries = root.findall('atom:entry', ATOM_NS)

    videos = []
    for entry in entries[:limit]:
        title_el = entry.find('atom:title', ATOM_NS)
        link_el = entry.find('atom:link', ATOM_NS)
        pub_el = entry.find('atom:published', ATOM_NS)
        vid_el = entry.find('yt:videoId', ATOM_NS)

        media_group = entry.find('media:group', ATOM_NS)
        desc = ""
        thumb_url = ""
        views = "0"

        if media_group is not None:
            desc_el = media_group.find('media:description', ATOM_NS)
            if desc_el is not None and desc_el.text:
                desc = desc_el.text.strip()
            thumb_el = media_group.find('media:thumbnail', ATOM_NS)
            if thumb_el is not None:
                thumb_url = thumb_el.attrib.get('url', '')
            comm_el = media_group.find('media:community', ATOM_NS)
            if comm_el is not None:
                stats_el = comm_el.find('media:statistics', ATOM_NS)
                if stats_el is not None:
                    views = stats_el.attrib.get('views', '0')

        title = title_el.text if title_el is not None else "Untitled"
        video_id = vid_el.text if vid_el is not None else ""
        link = link_el.attrib.get('href', f"https://www.youtube.com/watch?v={video_id}")
        published_raw = pub_el.text if pub_el is not None else ""

        # Format date
        try:
            dt = datetime.fromisoformat(published_raw.replace('Z', '+00:00'))
            published_formatted = dt.strftime('%Y-%m-%d %H:%M UTC')
            date_short = dt.strftime('%Y-%m-%d')
        except Exception:
            published_formatted = published_raw
            date_short = published_raw[:10]

        # Determine type (Short vs Long-form)
        is_short = "/shorts/" in link or "#shorts" in title.lower() or "#short" in title.lower()
        video_type = "Short" if is_short else "Long Video"
        
        # High quality thumbnail fallback
        if not thumb_url and video_id:
            thumb_url = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

        videos.append({
            "id": video_id,
            "title": title,
            "type": video_type,
            "url": link,
            "published": published_formatted,
            "date": date_short,
            "views": int(views) if views.isdigit() else 0,
            "thumbnail": thumb_url,
            "description_snippet": desc[:180] + ("..." if len(desc) > 180 else "")
        })

    return videos

def format_as_markdown(videos, channel_handle: str) -> str:
    """Format videos as a GitHub-flavored Markdown table and list."""
    md = []
    md.append(f"# Latest Released Videos: {channel_handle}\n")
    md.append(f"Auto-generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    md.append("| Date | Type | Title | Link |")
    md.append("| :--- | :---: | :--- | :--- |")
    for v in videos:
        badge = "🎬 Short" if v["type"] == "Short" else "📹 Long Video"
        md.append(f"| `{v['date']}` | **{badge}** | {v['title']} | [Watch on YouTube]({v['url']}) |")
    
    md.append("\n---\n")
    md.append("## Video Details & Thumbnails\n")
    for v in videos:
        badge = "🎬 Short" if v["type"] == "Short" else "📹 Long Video"
        md.append(f"### {v['title']}")
        md.append(f"- **Format:** {badge}")
        md.append(f"- **Released:** {v['published']}")
        md.append(f"- **URL:** [{v['url']}]({v['url']})")
        if v.get('description_snippet'):
            md.append(f"- **Description:** {v['description_snippet']}")
        if v.get('thumbnail'):
            md.append(f"\n[![Thumbnail]({v['thumbnail']})]({v['url']})\n")
    return "\n".join(md)

def main():
    parser = argparse.ArgumentParser(description="Fetch latest videos from @RifatErdemSahin YouTube channel")
    parser.add_argument("--handle", default=DEFAULT_HANDLE, help="YouTube handle (e.g., @RifatErdemSahin)")
    parser.add_argument("--channel-id", default=None, help="Explicit YouTube Channel ID")
    parser.add_argument("--limit", type=int, default=15, help="Maximum number of videos to fetch (max 15 from RSS)")
    parser.add_argument("--format", choices=["json", "markdown", "text"], default="json", help="Output format")
    parser.add_argument("--output", default=None, help="Output file path (optional)")

    args = parser.parse_args()

    channel_id = args.channel_id
    if not channel_id:
        if args.handle == DEFAULT_HANDLE:
            channel_id = DEFAULT_CHANNEL_ID
        else:
            channel_id = resolve_channel_id(args.handle)

    videos = fetch_videos(channel_id, limit=args.limit)

    if args.format == "json":
        result = json.dumps({"channel": args.handle, "channel_id": channel_id, "total": len(videos), "videos": videos}, indent=2)
    elif args.format == "markdown":
        result = format_as_markdown(videos, args.handle)
    else:
        lines = [f"[{v['date']}] [{v['type']}] {v['title']} -> {v['url']}" for v in videos]
        result = "\n".join(lines)

    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"Successfully saved {len(videos)} videos to {args.output}")
    else:
        print(result)

if __name__ == "__main__":
    main()
