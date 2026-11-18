# Content Engine & OKR Framework: @RifatErdemSahin & Skool

🌐 **Live Dashboard (Fly.io — notes & chat enabled):**  
👉 **[https://rifat-content-calendar.fly.dev/](https://rifat-content-calendar.fly.dev/)**

📄 Read-only mirror (GitHub Pages, no notes/chat): [rifaterdemsahin.github.io/content-calendar](https://rifaterdemsahin.github.io/content-calendar/)

An integrated multi-format content calendar, production pipeline, and OKR execution system connecting **YouTube** ([@RifatErdemSahin](https://www.youtube.com/@RifatErdemSahin)) and your **Skool Community**.

---

## 💡 Strategic Rationale

Why is this content engine structured this way?

### 1. Algorithmic Dual-Engine Dynamics
YouTube operates two distinct recommendation engines:
* **The Shorts Engine:** Optimizes for rapid discovery, swiping behavior, and low-friction virality. It brings cold audiences to the channel who would never click an unfamiliar 20-minute video.
* **The Long-Form / Course Engine:** Optimizes for watch time, technical depth, and authority. It builds the deep trust and credibility required for software developers and tech leads to follow your frameworks.

### 2. The 400% Repurposing Multiplier
Solo creators burn out when trying to produce disconnected content for multiple platforms. In this architecture:
* Every **Wednesday Long-Form Video** is filmed as the "Parent Asset".
* From that single recording session, **2–3 YouTube Shorts** are extracted (the hook, the aha moment, and the common pitfall).
* The code/config created during the recording becomes the **Skool Lead Magnet** (n8n JSON, Dockerfile, dotfiles).
* The challenge solved becomes the **Tuesday Skool Community Prompt**.
* **Result:** 1 production session yields 6 distinct touchpoints across YouTube and Skool.

### 3. Skool as the Retention & Value Sink
Social media followings are rented land. Directing viewers to a free/paid Skool community captures the audience into an owned environment featuring:
* Downloadable project templates & workflow JSONs.
* Weekly live office hours & workflow debugging clinics.
* Peer-to-peer code reviews, project showcases, and gamified leaderboards.

---

## 📊 Estimated Numbers & Quantitative Projections

Standardized estimates across a **90-Day Execution Cycle**:

### 1. Audience & Reach Metrics
* **Total Video Views Target:** **150,000 views**
  * YouTube Shorts: ~80,000 views across 24 planned Shorts (avg 3,300 views/short).
  * Long-Form Tutorials: ~50,000 views across 12 tutorials (avg 4,100 views/video).
  * Course Masterclasses: ~20,000 views across 4 deep-dive lectures (avg 5,000 views/video).
* **Net Subscriber Growth:** **+5,000 subscribers** (targeting mid-to-senior software engineers, DevOps, and AI developers).
* **Audience Retention Target:**
  * Long-Form Average Percentage Viewed (APV): **>42%**
  * Shorts Viewed vs Swiped Away: **>75%**

### 2. Conversion Funnel Math (YouTube to Skool)
```
150,000 Total Video Views
       │
       ▼ (Long-form views: ~70,000)
 1,800 Lead Magnet Link Clicks (~8.2% click-through rate on descriptions & pinned comments)
       │
       ▼
   500 New Skool Community Members (~27.7% landing page signup conversion)
       │
       ▼
 175-200 Active Weekly Builders (35-40% 30-day retention rate)
```

### 3. Production Time & Cost Budgets
* **Weekly Production Time:** **10.5 hours** total:
  * Long-form tutorial (prep, shoot, edit, publish): 6.0 hrs
  * Shorts extraction & standalone cuts: 2.5 hrs
  * Skool resource pack & live session: 2.0 hrs
* **Financial Overhead:** **~$15 / month** (strictly LLM API tokens and cloud testing instances). Zero external studio rental costs by leveraging:
  * *Location 1:* **Main Chair Living Room** (Conversation format — thought leadership & module conceptual intro)
  * *Location 2:* **Standup Room** (POC delivery, screen share, and in-person builds & hardening)
  * *Location 3:* **Cambridge Walk-and-Talk** (Shorts: "Dictionary AI Terms" 45s fast definitions)

### 4. Course Video Production Format (For Skool Classroom)
Structured using a **Coursera-Style Micro-Lecture Model**:
* **5 minutes per video**
* **3 videos per module** (15 minutes total per module)
  * *Video 1 (5m):* The Mental Model (Main Chair Living Room Conversation)
  * *Video 2 (5m):* Hands-On POC Delivery & Screen Share (Standup Room)
  * *Video 3 (5m):* Production Hardening & Capstone Challenge (Standup Room)

---

## 📹 Fetching Latest Released Videos (Automation Script)

A standalone script [`scripts/fetch_latest_videos.py`](file:///home/rifaterdemsahin/projects/content-calendar/scripts/fetch_latest_videos.py) queries the official YouTube Atom feed for channel `@RifatErdemSahin` (ID: `UCSJyG3bTM7lnjMIZcV8C4OQ`), requiring **zero API keys**.

### Usage Commands:
```bash
# Print latest videos to terminal as Markdown
python3 scripts/fetch_latest_videos.py --format markdown --limit 5

# Export directly to data/latest-videos.json
python3 scripts/fetch_latest_videos.py --format json --output data/latest-videos.json

# Export to Markdown file
python3 scripts/fetch_latest_videos.py --format markdown --output data/latest-videos.md
```

The script extracts video ID, title, URL, published date, views, thumbnail URL, and auto-classifies content into **🎬 Short** or **📹 Long Video**.

---

## 🎯 Strategic OKRs (Q1 90-Day Cycle)

* **Objective 1 (Authority & Reach):** Establish top-tier authority in AI Engineering & the Delivery Pilot movement (+5,000 YouTube Subscribers, 150k+ views).
* **Objective 2 (Community & Conversion):** Convert YouTube traffic into an engaged, active Skool community (+500 new members, 40% 30-day retention, 150+ member project shares).
* **Objective 3 (Production Engine):** Build a frictionless repurposing pipeline (<6 hrs turnaround per long video, 100% video-to-lead-magnet pairing, 48-hr Shorts extraction).

👉 See the complete OKR framework and grading rubric: [`okrs/content-and-community-okrs.md`](file:///home/rifaterdemsahin/projects/content-calendar/okrs/content-and-community-okrs.md)

---

## 📅 The 4-Week Publishing Matrix

| Day | Format | Channel | Content Role | OKR Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Monday** | **Short #1** | YouTube Shorts | Tactical hack / Tool speedrun | Top-of-funnel discovery (KR 1.2) |
| **Tuesday** | **Skool Post** | Skool Community | Discussion prompt / Weekly challenge | Member activation & retention (KR 2.3) |
| **Wednesday** | **Long Video** | YouTube Main | Technical deep dive / End-to-end build | Subscriber trust & lead generation (KR 1.1, 2.2) |
| **Friday** | **Short #3** | YouTube Shorts | Delivery Pilot mindset / Architecture | Thought leadership & traffic (KR 1.3) |
| **Saturday** | **Course + Short #2** | YouTube / Skool | Bi-weekly masterclass; plus a scheduled Short repurposed from Wednesday | Cornerstone authority & loyalty (KR 1.4, 2.4), repurposing turnaround (KR 3.3) |
| **Sunday** | **Skool Cohort + Weekly Digest** | Skool / Email | Skool Live 13:30 (bi-weekly clinic) + live cohort session (20 run so far, each saved to Skool) + community wrap-up & next-week preview | 30-day retention & culture (KR 2.5) |

👉 Blocked & fixed days (Thursday travel, Wednesday college recording, Sunday cohorts): [`blocked.html`](https://rifat-content-calendar.fly.dev/blocked.html)  
👉 Explore the day-by-day 4-week calendar matrix: [`calendar/detailed-calendar-matrix.md`](file:///home/rifaterdemsahin/projects/content-calendar/calendar/detailed-calendar-matrix.md)  
👉 Track active production and weekly metrics: [`calendar/weekly-production-tracker.md`](file:///home/rifaterdemsahin/projects/content-calendar/calendar/weekly-production-tracker.md)

---

## 📂 Repository Directory Index

* **`audit/`**
  * [`sanity-check-and-reality.md`](file:///home/rifaterdemsahin/projects/content-calendar/audit/sanity-check-and-reality.md) — Brutal engineering reality check, creator fantasy vs reality, gap analysis (725/1,000 subs), 4 realities of AI content in 2026, and integration with [`rifaterdemsahin/99percentTopicsAI`](https://github.com/rifaterdemsahin/99percentTopicsAI).
* **`business/`**
  * [`monetization-and-business-plan.md`](file:///home/rifaterdemsahin/projects/content-calendar/business/monetization-and-business-plan.md) — YouTube Partner Program (YPP) milestone timeline (725/1,000 subs), watch hours math, and the 5-tier $10,000+/mo creator business blueprint.
* **`scripts/`**
  * [`analyze_past_performance.py`](file:///home/rifaterdemsahin/projects/content-calendar/scripts/analyze_past_performance.py) — Extracts, analyzes, and aggregates historical video views, catalog performance, and category distributions from [@RifatErdemSahin](https://www.youtube.com/@RifatErdemSahin).
  * [`fetch_latest_videos.py`](file:///home/rifaterdemsahin/projects/content-calendar/scripts/fetch_latest_videos.py) — Python script to automatically fetch, classify (Short vs Long), and export latest videos from YouTube RSS.
* **`data/`**
  * [`past-performance.md`](file:///home/rifaterdemsahin/projects/content-calendar/data/past-performance.md) — Comprehensive historical performance report and Top 10 All-Time videos.
  * [`past-performance.json`](file:///home/rifaterdemsahin/projects/content-calendar/data/past-performance.json) — Full structured JSON of all historical catalog video analytics.
  * [`latest-videos.json`](file:///home/rifaterdemsahin/projects/content-calendar/data/latest-videos.json) — Structured JSON of the latest released videos.
  * [`latest-videos.md`](file:///home/rifaterdemsahin/projects/content-calendar/data/latest-videos.md) — Formatted Markdown table and thumbnails of the latest released videos.
* **`production/`**
  * [`best-performing-videos-and-shoot-plan.md`](file:///home/rifaterdemsahin/projects/content-calendar/production/best-performing-videos-and-shoot-plan.md) — Top video archetypes, time estimates, shooting locations, and 1-day batch filming workflow.
* **`okrs/`**
  * [`content-and-community-okrs.md`](file:///home/rifaterdemsahin/projects/content-calendar/okrs/content-and-community-okrs.md) — Strategic Objectives, Key Results, targets, stretch goals, and scoring.
* **`calendar/`**
  * [`detailed-calendar-matrix.md`](file:///home/rifaterdemsahin/projects/content-calendar/calendar/detailed-calendar-matrix.md) — Day-by-day 4-week schedule with formats, hooks, deliverables, and OKR tags.
  * [`monthly-schedule.md`](file:///home/rifaterdemsahin/projects/content-calendar/calendar/monthly-schedule.md) — Thematic overview across 4 core sprints.
  * [`weekly-production-tracker.md`](file:///home/rifaterdemsahin/projects/content-calendar/calendar/weekly-production-tracker.md) — Kanban status tracker and weekly scorecard.
* **`templates/`**
  * [`short-script-template.md`](file:///home/rifaterdemsahin/projects/content-calendar/templates/short-script-template.md) — 35–55 second 3-beat script format.
  * [`long-video-brief.md`](file:///home/rifaterdemsahin/projects/content-calendar/templates/long-video-brief.md) — 12–25 minute tutorial blueprint.
  * [`course-module-template.md`](file:///home/rifaterdemsahin/projects/content-calendar/templates/course-module-template.md) — Structure for 45–90 minute cornerstone masterclasses.
* **`strategy/`**
  * [`skool-funnel.md`](file:///home/rifaterdemsahin/projects/content-calendar/strategy/skool-funnel.md) — Lead magnet mapping, pinned comments, video descriptions, and gamification.

---

## 📝 Notes + 🤖 Chat Agent

**Live:** [rifat-content-calendar.fly.dev](https://rifat-content-calendar.fly.dev/) — the dashboard is public; the notes/chat widget (bottom-right) requires **Sign in with Microsoft** (only `info@deliverypilot.net`).

- **Content Rationale & Azure Storage Notes:** Every sprint item on the calendar records its strategic rationale (displayed directly on the card and in the search palette). Alt/Option-click any element or click **Note** on a content card to record notes with their pre-filled rationale. Notes are persisted directly as JSON blobs in Azure Blob Storage (`notes/` container). **Copy this page / Copy ALL notes** exports them as Markdown.
- **Chat agent:** describe a change; an Azure Function starts a [Daytona](https://www.daytona.io) sandbox, clones this repo, runs Claude Code (Claude subscription token first, API key as fallback), and opens a pull request. Merging it updates the repo.
- **Instant Menu Search:** press `⌘K`, `Ctrl+K`, or `/` (or click **Search...** in the top navigation) to jump across calendar topics, video blueprints, rationales, script templates, OKRs, blocked days, and Azure Key Vault secrets.

Architecture: browser → **Fly.io** (`server/`: static site + Microsoft/Entra OIDC login + `/api` proxy) → **Azure Function** (`api/`) → Storage (notes, jobs, queue) / Daytona → GitHub PR.
Secrets live in Azure Key Vault `dp-kv-deliverypilot` (`ANTHROPIC-API-KEY`, `CLAUDE-CODE-OAUTH-TOKEN`, `DAYTONA-API-KEY`, `github-pat`, `CC-ADMIN-TOKEN`, `CC-ENTRA-CLIENT-SECRET`, `CC-SESSION-SECRET`, `KILO-API-KEY`); the Function reads them via Key Vault references and Fly gets them as Fly secrets directly synced from Key Vault. The browser never holds a secret.

Requirements and runbook: [`docs/requirements.md`](docs/requirements.md) · pages: [`key-vault.html`](key-vault.html), [`requirements.html`](requirements.html), [`expectations.html`](expectations.html).

### 🚀 Deploying with Azure Key Vault

All deployment secrets are fetched directly from Azure Key Vault `dp-kv-deliverypilot`:

```bash
# Automated end-to-end deploy (syncs Key Vault secrets to Fly & deploys site + API)
./scripts/deploy.sh --all

# Deploy only the Fly.io site (server + static pages) with Key Vault secrets
./scripts/deploy.sh --site

# Deploy only the Azure Function API with Key Vault references
./scripts/deploy.sh --api

# Dry run / check Key Vault secrets without changing anything
./scripts/deploy.sh --dry-run
./scripts/deploy.sh --verify
```

Tests: `node --test server/`, `cd api && npm test`. GitHub Pages deploys automatically from `main`.
