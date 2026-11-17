#!/usr/bin/env python3
"""
analyze_past_performance.py
Analyzes the historical video performance of the @RifatErdemSahin YouTube channel.
Extracts view counts, titles, formats, and publishes analytics to JSON and Markdown.
"""

import json
import os
import re
import urllib.request
from datetime import datetime

CHANNEL_HANDLE = "@RifatErdemSahin"
CHANNEL_URL = f"https://www.youtube.com/{CHANNEL_HANDLE}"

def fetch_html(url):
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        return resp.read().decode('utf-8', errors='ignore')

def extract_initial_data(html):
    match = re.search(r'var ytInitialData = ({.*?});</script>', html)
    if not match:
        match = re.search(r'window\[\"ytInitialData\"\] = ({.*?});', html)
    return json.loads(match.group(1)) if match else None

def get_channel_videos():
    videos = []
    
    # 1. Fetch Long-form Videos
    html_v = fetch_html(f"{CHANNEL_URL}/videos")
    data_v = extract_initial_data(html_v)
    if data_v:
        def find_lockups(obj):
            if isinstance(obj, dict):
                if 'lockupViewModel' in obj:
                    lvm = obj['lockupViewModel']
                    title = lvm.get('metadata', {}).get('lockupMetadataViewModel', {}).get('title', {}).get('content', '')
                    meta_rows = lvm.get('metadata', {}).get('lockupMetadataViewModel', {}).get('metadata', {}).get('contentMetadataViewModel', {}).get('metadataRows', [])
                    
                    views_str = "0"
                    time_ago = ""
                    for row in meta_rows:
                        for part in row.get('metadataParts', []):
                            text = part.get('text', {}).get('content', '')
                            if 'views' in text.lower() or text.isdigit():
                                views_str = text.lower().replace('views', '').replace(',', '').strip()
                            elif 'ago' in text.lower():
                                time_ago = text.strip()
                    
                    vid_id = lvm.get('contentId', '')
                    clean_views = 0
                    if views_str.isdigit():
                        clean_views = int(views_str)
                    elif 'k' in views_str:
                        clean_views = int(float(views_str.replace('k', '')) * 1000)

                    if vid_id and title:
                        videos.append({
                            "id": vid_id,
                            "title": title,
                            "type": "Long Video",
                            "views": clean_views,
                            "time_ago": time_ago,
                            "url": f"https://www.youtube.com/watch?v={vid_id}",
                            "thumbnail": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                        })
                for v in obj.values():
                    find_lockups(v)
            elif isinstance(obj, list):
                for i in obj:
                    find_lockups(i)
        find_lockups(data_v)

    # 2. Fetch Shorts
    html_s = fetch_html(f"{CHANNEL_URL}/shorts")
    data_s = extract_initial_data(html_s)
    if data_s:
        def find_shorts(obj):
            if isinstance(obj, dict):
                if 'shortsLockupViewModel' in obj:
                    slvm = obj['shortsLockupViewModel']
                    title = slvm.get('overlayMetadata', {}).get('primaryText', {}).get('content', '')
                    views_raw = slvm.get('overlayMetadata', {}).get('secondaryText', {}).get('content', '')
                    vid_id = slvm.get('entityId', '').replace('shorts-shelf-item-', '')
                    
                    clean_views = 0
                    num_str = views_raw.lower().replace('views', '').replace(',', '').strip()
                    if num_str.isdigit():
                        clean_views = int(num_str)
                    elif 'k' in num_str:
                        clean_views = int(float(num_str.replace('k', '')) * 1000)

                    if vid_id and title:
                        videos.append({
                            "id": vid_id,
                            "title": title,
                            "type": "Short",
                            "views": clean_views,
                            "time_ago": "Recent",
                            "url": f"https://www.youtube.com/shorts/{vid_id}",
                            "thumbnail": f"https://i.ytimg.com/vi/{vid_id}/hqdefault.jpg"
                        })
                for v in obj.values():
                    find_shorts(v)
            elif isinstance(obj, list):
                for i in obj:
                    find_shorts(i)
        find_shorts(data_s)

    # Sort descending by view count
    videos.sort(key=lambda x: x['views'], reverse=True)
    return videos

def analyze_performance(videos):
    total_videos = len(videos)
    if total_videos == 0:
        return {}

    total_views = sum(v['views'] for v in videos)
    long_videos = [v for v in videos if v['type'] == 'Long Video']
    shorts = [v for v in videos if v['type'] == 'Short']

    long_views = sum(v['views'] for v in long_videos)
    shorts_views = sum(v['views'] for v in shorts)

    avg_views = round(total_views / total_videos, 1)
    avg_long_views = round(long_views / len(long_videos), 1) if long_videos else 0
    avg_short_views = round(shorts_views / len(shorts), 1) if shorts else 0

    # Categorize top themes
    topics = {
        "AI Agents & Automation": 0,
        "Delivery Pilot & Career Mindset": 0,
        "RAG & Knowledge Bases": 0,
        "Developer Tooling & IDE": 0
    }
    for v in videos:
        t = v['title'].lower()
        if 'agent' in t or 'no-code' in t or 'workforce' in t or 'solutions' in t or 'n8n' in t:
            topics["AI Agents & Automation"] += v['views']
        elif 'pilot' in t or 'career' in t or 'work' in t or 'elon' in t or 'skills' in t or 'interview' in t:
            topics["Delivery Pilot & Career Mindset"] += v['views']
        elif 'rag' in t or 'knowledge' in t or 'vector' in t or 'obsidian' in t or 'words' in t:
            topics["RAG & Knowledge Bases"] += v['views']
        elif 'ide' in t or 'token' in t or 'kilo' in t or 'deepseek' in t or 'glasses' in t or 'whiteboard' in t:
            topics["Developer Tooling & IDE"] += v['views']

    return {
        "channel": CHANNEL_HANDLE,
        "subscribers": 725,
        "total_videos_analyzed": total_videos,
        "total_views_recorded": total_views,
        "long_form_count": len(long_videos),
        "long_form_views": long_views,
        "shorts_count": len(shorts),
        "shorts_views": shorts_views,
        "average_views_per_video": avg_views,
        "average_views_long_form": avg_long_views,
        "average_views_shorts": avg_short_views,
        "topic_views_distribution": topics,
        "top_performing_videos": videos[:10],
        "all_videos": videos
    }

def format_markdown_report(report):
    md = []
    md.append(f"# Historical Performance Report: {report['channel']}\n")
    md.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
    md.append("## 📊 Channel Overview Metrics\n")
    md.append(f"- **Current Subscribers:** 725 (Only 275 to 1,000 Milestone)")
    md.append(f"- **Total Catalog Videos Analyzed:** {report['total_videos_analyzed']}")
    md.append(f"- **Total Views Tracked:** {report['total_views_recorded']:,}")
    md.append(f"- **Long-Form Videos:** {report['long_form_count']} (Total Views: {report['long_form_views']:,} | Avg: {report['average_views_long_form']} views/video)")
    md.append(f"- **Shorts:** {report['shorts_count']} (Total Views: {report['shorts_views']:,} | Avg: {report['average_views_shorts']} views/video)\n")
    
    md.append("## 🏆 Top 10 Performing Videos Historically\n")
    md.append("| Rank | Views | Format | Published | Title |")
    md.append("| :---: | :---: | :---: | :---: | :--- |")
    for i, v in enumerate(report['top_performing_videos'], 1):
        fmt = "🎬 Short" if v['type'] == "Short" else "📹 Long"
        md.append(f"| #{i} | **{v['views']:,}** | {fmt} | {v['time_ago']} | [{v['title']}]({v['url']}) |")
    
    md.append("\n## 🎯 Historical Views by Topic Category\n")
    md.append("| Topic Category | Views Driven | Dominant Angle |")
    md.append("| :--- | :---: | :--- |")
    for topic, views in report['topic_views_distribution'].items():
        md.append(f"| **{topic}** | {views:,} views | High Evergreen Interest |")

    return "\n".join(md)

def main():
    videos = get_channel_videos()
    report = analyze_performance(videos)
    
    os.makedirs("data", exist_ok=True)
    with open("data/past-performance.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    
    md_report = format_markdown_report(report)
    with open("data/past-performance.md", "w", encoding="utf-8") as f:
        f.write(md_report)
        
    print(f"Successfully analyzed {len(videos)} videos.")
    print(f"Saved to data/past-performance.json and data/past-performance.md")

if __name__ == "__main__":
    main()
