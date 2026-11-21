#!/usr/bin/env python3
"""Fill data/guide.json "updates" with each page's last git change (time + commit subject).

The reading order (sections/pages) is hand-written in data/guide.json; this script only
refreshes the "updates" map that powers the Guide's "Recently updated" list.
Run by scripts/weekly_reports.sh, scripts/ship.sh and the Fly deploy workflow.

Put "[chrome]" in a commit message when it only touches shared page furniture, so it is
not counted as a page update.

Usage: python3 scripts/build_guide.py
"""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
GUIDE = ROOT / "data" / "guide.json"


def last_change(page):
    out = subprocess.run(
        # Commits tagged [chrome] are site-wide boilerplate (e.g. adding a script tag to every
        # page); skip them so "Recently updated" shows real content changes.
        ["git", "log", "-1", "--format=%cI%x09%s", "--invert-grep", "--grep=[chrome]", "--fixed-strings", "--", page],
        cwd=ROOT, capture_output=True, text=True, check=False,
    ).stdout.strip()
    if not out:
        return None
    when, _, subject = out.partition("\t")
    return {"at": when, "change": subject}


def main():
    guide = json.loads(GUIDE.read_text(encoding="utf-8"))
    pages = sorted(p.name for p in ROOT.glob("*.html"))
    updates = {}
    for page in pages:
        info = last_change(page)
        if info:
            updates[page] = info
    guide["updates"] = updates
    GUIDE.write_text(json.dumps(guide, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"guide: {len(updates)} pages dated")


if __name__ == "__main__":
    main()
