# Coursera-Style Course Video Module Blueprint (For Skool Classroom)

Target Format: **Coursera-Style Modular Production**  
Video Length: **~5 minutes per video**  
Module Structure: **3 videos per module (15 minutes total per module)**  
Target Platform: **Skool Classroom (with YouTube Compilation / Teaser)**

---

## 🎓 The 3-Part Micro-Lecture Structure (15 Minutes Total)

```
┌────────────────────────────────────────────────────────┐
│  MODULE [X]: [Module Topic Name]                       │
├────────────────────────────────────────────────────────┤
│  🎬 Video 1 (5 mins): Concept & Core Mental Model      │
│  • Filmed in Main Chair Living Room (Conversation)     │
│  • High-level context: Why this matters, architecture  │
├────────────────────────────────────────────────────────┤
│  🎬 Video 2 (5 mins): POC Delivery & Screen Share      │
│  • Filmed in Standup Room (POC & Screen Share)         │
│  • Live hands-on implementation & proof of concept     │
├────────────────────────────────────────────────────────┤
│  🎬 Video 3 (5 mins): Enterprise Gotchas & Assignment  │
│  • Filmed in Standup Room / Desk                       │
│  • Practical hardening + Skool Capstone Challenge      │
└────────────────────────────────────────────────────────┘
```

---

## Detailed 5-Minute Script Breakdowns

### Video 1: Concept & Mental Model (5:00)
* **Location:** 🛋️ *Main Chair Living Room (Conversation Format)*
* **Objective:** Give the student the mental model and high-level architectural view without getting bogged down in syntax.
* **Timeline:**
  * **0:00 - 0:45:** Hook & Real-World Use Case ("In this lesson, you will master...")
  * **0:45 - 3:00:** The Core Architectural Concept (Diagram or conversation breakdown)
  * **3:00 - 4:30:** Key Trade-offs & When to Use It (Delivery Pilot perspective)
  * **4:30 - 5:00:** Transition to Video 2 ("Let's jump into the code and build it now.")

### Video 2: POC Delivery & Screen Share (5:00)
* **Location:** 🖥️ *Standup Room (POC Delivery Screen Share & In Person)*
* **Objective:** Step-by-step live build of the minimal viable proof of concept.
* **Timeline:**
  * **0:00 - 0:30:** Overview of the working demo we are about to construct
  * **0:30 - 3:30:** Focused live build (n8n node setup / Python agent / configuration)
  * **3:30 - 4:30:** Executing the test run and verifying outputs
  * **4:30 - 5:00:** Summary of the POC state & transition to hardening in Video 3

### Video 3: Production Hardening & Skool Action Challenge (5:00)
* **Location:** 🖥️ *Standup Room / Desk*
* **Objective:** Address real-world failure modes (rate limits, timeouts) and assign the Skool homework.
* **Timeline:**
  * **0:00 - 1:00:** The #1 failure mode in production for this setup
  * **1:00 - 3:00:** Adding error recovery, guardrails, and environment variables
  * **3:00 - 4:15:** The Skool Classroom Homework Challenge (Clear action item)
  * **4:15 - 5:00:** Outro & Skool Community submission prompt:
    > *"Download the workflow JSON attached below in the Skool classroom, complete the capstone challenge, and share your screenshot in the community feed to unlock your next module."*

---

## 📦 Companion Module Deliverables (Attached in Skool)

1. **Downloadable Starter Asset:** `.json` workflow, `.env.example`, or GitHub repo template.
2. **Cheat Sheet / Architecture Diagram:** 1-page visual summary PDF.
3. **Action Checklist:** 3 specific checkboxes for the student to mark complete.
4. **Gamification Level Trigger:** Points awarded upon submitting homework in the Skool showcase feed.
