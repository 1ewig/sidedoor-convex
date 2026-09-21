---
name: hackathon
description: >-
  Playbook and guidelines for the Convex All Gas Hackathon (Sept 2026), covering
  sponsor integrations (Convex, Firecrawl, AgentMail), scoring rubrics, live deployment,
  demo video checklist, and submission requirements.
---

# Convex All Gas Hackathon — Playbook & Strategy Guide

This skill equips the agent and developer to optimize, Polish, and prepare **SideDoor** for winning the **Convex All Gas Hackathon**.

---

## 🏆 Hackathon Overview & Key Details

- **Event**: Convex All Gas Hackathon (Build Jam)
- **Submission Deadline**: **September 22, 2026 at 12:00 PM PT**
- **Total Prize Pool**: **$45,000** ($16,500 Cash, $8,500 Codex Credits, $20,000 Firecrawl Credits)
  - 🥇 1st Place: $10,000 Cash
  - 🥈 2nd Place: $5,000 Cash
  - 🥉 3rd Place: $1,500 Cash
- **Official Sponsors**: **Convex**, **Firecrawl**, **AgentMail**, **OpenAI**
- **Submission Portal**: `vibeapps.dev` via Luma registration

---

## 🎯 The "Triple Threat" Sponsor Alignment in SideDoor

SideDoor uniquely incorporates all three primary hackathon sponsors natively into a single cohesive product:

1. **Convex** (Reactive Real-time Database):
   - Real-time event wire syncing (`events` table).
   - Bi-directional 2-way email thread updates (`threads` and `messages` tables).
   - Autonomous telemetry logging (`scoutRuns` table).
   - Optimistic offline fallback with Zustand.

2. **Firecrawl** (Intelligent Autonomous Web Crawling):
   - Fast single-pass targeted venue calendar discovery.
   - Deep structured extraction & hub-resolver (`/map` + parallel `/scrape`).
   - Resilient candidate image harvesting across social cards & flyer tags.

3. **AgentMail** (Autonomous Two-Way Email Outreach):
   - Automated door-ticket and venue policy inquiries dispatched directly to organizers.
   - Inbound webhook syncing organizer responses into Convex threads and the live UI.
   - Interactive 2-way Outbox drawer with prompt chips and manual follow-ups.

---

## 📋 Submission Requirements Checklist

Every submission must include:
- [ ] **Public GitHub Repository Link**: Clean commit history, comprehensive README, no API keys exposed.
- [ ] **Live Working Web App URL**: Deployed to Vercel/Cloudflare with Convex cloud backend connected.
- [ ] **3-Minute Demo Video**: High-energy walkthrough showing:
  1. The problem (underground local events are invisible to mainstream ticket platforms).
  2. The autonomous scout in action (⚡ Fast & 🔬 Deep modes discovering real gatherings).
  3. Real-time Convex database reactivity.
  4. Autonomous AgentMail outreach & live inbound organizer responses.
  5. Interactive cartographic MapLibre pin & filter tuning.

---

## 🚀 Quality & Polish Verification Workflow

Before submitting, execute the full verification suite:

```bash
# 1. Zero-warning lint check
bun run lint

# 2. Strict TypeScript 7 typecheck
bunx tsc --noEmit

# 3. Turbopack production build test
bun run build

# 4. Pipeline test verification
bun run test:fast
bun run scout:cli "Austin, TX" --when "this weekend"
```

---

## 💡 Judging Rubric & Tips

- **Real-Time UX**: Highlight Convex's reactive sync when events or emails arrive without page reloads.
- **Completeness**: Emphasize that SideDoor is not a static mockup—it executes live web crawls, runs Gemini LLM curation, computes Haversine distances, and sends actual emails via AgentMail.
- **Design Excellence**: Adhere to SideDoor's strict design system tokens (`--theme-bg-*`, `--theme-text-*`, `--theme-brand-*`).
