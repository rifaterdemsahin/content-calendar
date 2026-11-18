#!/usr/bin/env python3
"""Check every "date + weekday" pair in the repo against the real calendar.

Finds patterns such as:
  "Nov 18 ... Wed"   "Wed Nov 18"   "**Nov 20** | Wed"   "Mon 16 Nov"
and reports any pair where the weekday does not match the date's actual weekday.
The year defaults to 2026 (the sprint year) unless the text gives one.

Usage: python3 scripts/validate-dates.py          (exit 1 if any mismatch)
"""
import datetime as dt
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
YEAR = 2026
DAYS = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6}
MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
DAY_RE = r"(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?:day|nesday|sday|urday|sdayy|rsday|day)?"
MON_RE = r"(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
PATTERNS = [
    # "Wed Nov 18" / "Wednesday, November 18" / "Wed • Nov 18"
    re.compile(rf"\b{DAY_RE}\b[\s,•·(|-]{{1,4}}{MON_RE}\.?\s+(\d{{1,2}})\b", re.I),
    # "Nov 18 (Wed)" / "Nov 18 — Wed" / "**Nov 18** | Wed"
    re.compile(rf"\b{MON_RE}\.?\s+(\d{{1,2}})\b[\s*|—–(,:-]{{1,12}}{DAY_RE}\b", re.I),
]
SKIP_DIRS = {".git", "node_modules", "scratch", "tmp"}
SKIP_NAMES = {"validate-dates.py"}


def check(match, text_kind):
    g = match.groups()
    # Work out which group order this pattern used.
    if g[0].lower()[:3] in DAYS and g[1][:3].lower() in MONTHS:
        day_name, mon, num = g[0], g[1], g[2]
    else:
        mon, num, day_name = g[0], g[1], g[2]
    month = MONTHS[mon[:3].lower()]
    try:
        real = dt.date(YEAR, month, int(num))
    except ValueError:
        return f"invalid date {mon} {num}"
    want = DAYS[day_name[:3].lower()]
    if real.weekday() != want:
        return f"{day_name[:3]} {mon[:3]} {num} is a {real.strftime('%A')} in {YEAR}"
    return None


def scan(path):
    problems = []
    text = path.read_text(encoding="utf-8", errors="ignore")
    for lineno, line in enumerate(text.splitlines(), start=1):
        for pat in PATTERNS:
            for m in pat.finditer(line):
                err = check(m, path.suffix)
                if err:
                    problems.append((lineno, m.group(0).strip(), err))
    return problems


def main():
    bad = 0
    checked = 0
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in {".html", ".md", ".json", ".js"}:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts) or path.name in SKIP_NAMES:
            continue
        checked += 1
        for lineno, found, err in scan(path):
            bad += 1
            print(f"{path.relative_to(ROOT)}:{lineno}: '{found}' -> {err}")
    print(f"files checked: {checked}; mismatches: {bad}")
    today = dt.date.today()
    print(f"today: {today.isoformat()} ({today.strftime('%A')})")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
