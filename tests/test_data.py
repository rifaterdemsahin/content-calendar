"""Data and page checks. Run before every ship: python3 -m unittest discover -s tests -v"""
import glob
import json
import pathlib
import re
import sys
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import importlib.util

import studio_stats  # noqa: E402


def _load_validator():
    spec = importlib.util.spec_from_file_location("validate_dates", ROOT / "scripts" / "validate-dates.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


validate_dates = _load_validator()

AUDIENCES = {"Consumers", "Professionals", "Businesses"}


def load(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


class Dates(unittest.TestCase):
    def test_every_date_matches_its_weekday(self):
        self.assertEqual(validate_dates.main(), 0)


class PlannedVideos(unittest.TestCase):
    def setUp(self):
        self.d = load("data/videos.json")
        self.videos = self.d["videos"]

    def test_ids_are_unique(self):
        ids = [v["id"] for v in self.videos]
        self.assertEqual(len(ids), len(set(ids)))

    def test_audiences_are_known(self):
        for v in self.videos:
            self.assertIn(v["audience"], AUDIENCES | {"TBD"}, v["id"])

    def test_every_planned_card_exists_on_the_dashboard(self):
        index = (ROOT / "index.html").read_text(encoding="utf-8")
        for v in self.videos:
            if v.get("status") == "done":
                continue
            self.assertIn(f'id="{v["id"]}"', index, f"{v['id']} is missing from index.html")

    def test_weekly_wip_is_within_limit(self):
        limit = self.d["wipLimitPerWeek"]
        for w in {v["week"] for v in self.videos if v["week"] >= 1}:
            n = sum(1 for v in self.videos if v["week"] == w and v.get("status") != "done")
            self.assertLessEqual(n, limit, f"week {w} has {n} videos in progress")

    def test_conversion_targets_are_numbers(self):
        for v in self.videos:
            c = v.get("conversion")
            self.assertIsNotNone(c, v["id"])
            self.assertIsInstance(c["target"], (int, float), v["id"])
            if c.get("actual") is not None:
                self.assertIsInstance(c["actual"], (int, float), v["id"])


class Goals(unittest.TestCase):
    def test_goal_file_is_complete(self):
        g = load("data/goals.json")
        self.assertIn(g["activeRate"], g["weeklyRate"])
        self.assertIsInstance(g["subscribers"], int)
        self.assertEqual(g["dates"]["subscriberGoal"], 1000)
        self.assertGreater(g["views90dTarget"], 0)


class Channels(unittest.TestCase):
    def test_platforms_have_required_fields(self):
        c = load("data/channels.json")
        self.assertGreaterEqual(len(c["platforms"]), 4)
        for p in c["platforms"]:
            for key in ("id", "name", "status"):
                self.assertIn(key, p)


class Stats(unittest.TestCase):
    def test_summary_matches_the_snapshot(self):
        snap = load("data/studio/studio-snapshot-2026-11-18.json")
        s = studio_stats.summarise(snap["videos"], snap["snapshotDate"])
        self.assertEqual(s["videos"], len(snap["videos"]))
        self.assertEqual(s["totalViews"], sum(v["views"] for v in snap["videos"]))
        self.assertEqual(s["longVideos"]["videos"] + s["shorts"]["videos"] + s["unknownLength"]["videos"], s["videos"])

    def test_empty_input_does_not_crash(self):
        s = studio_stats.summarise([], "2026-11-18")
        self.assertEqual(s["videos"], 0)
        self.assertEqual(s["avgViewsPerVideo"], 0)


class Pages(unittest.TestCase):
    def test_every_page_has_a_title(self):
        for page in glob.glob(str(ROOT / "*.html")):
            self.assertIn("<title>", pathlib.Path(page).read_text(encoding="utf-8"), page)

    def test_every_fetched_data_file_exists(self):
        pat = re.compile(r"fetch\(\s*['\"](data/[^'\"]+)['\"]")
        for page in glob.glob(str(ROOT / "*.html")) + glob.glob(str(ROOT / "assets" / "*.js")):
            for rel in pat.findall(pathlib.Path(page).read_text(encoding="utf-8")):
                self.assertTrue((ROOT / rel).exists(), f"{pathlib.Path(page).name} reads missing {rel}")

    def test_every_script_src_exists(self):
        pat = re.compile(r'<script src="(assets/[^"]+)"')
        for page in glob.glob(str(ROOT / "*.html")):
            for rel in pat.findall(pathlib.Path(page).read_text(encoding="utf-8")):
                self.assertTrue((ROOT / rel).exists(), f"{pathlib.Path(page).name} loads missing {rel}")


if __name__ == "__main__":
    unittest.main()
