# SideDoor — Convex "All Gas" Hackathon Build Log

> **Project Name**: SideDoor  
> **Tagline**: Autonomous Personal Scout & Real-Time Intelligence for Hyper-Local Cultural Gatherings  
> **Hackathon**: Convex "All Gas" Hackathon (September 2026)  
> **Live Web App**: [https://artful-octopus-475.convex.site](https://artful-octopus-475.convex.site)  
> **Repository**: [https://github.com/1ewig/sidedoor-convex](https://github.com/1ewig/sidedoor-convex)  
> **Convex Backend**: `https://artful-octopus-475.convex.cloud` ([Dashboard](https://dashboard.convex.dev/t/asad-a/sidedoor/artful-octopus-475))  
> **Inbound Webhook Endpoint**: `https://artful-octopus-475.convex.site/agent-mail/webhook`  
> **Target Track / Stack**: Convex (Reactive Backend & Real-time Database) + Firecrawl (Autonomous Multi-Lane Web Scraping) + AgentMail (Two-Way Inbox & Autonomous Organizer Correspondence) + Next.js 16 (Turbopack, TypeScript 7, Tailwind CSS v4, Google Gemini AI)

---

## 🌟 Executive Summary & Mission

The most vibrant cultural experiences in any city—underground jazz jam sessions, warehouse art exhibitions, pop-up supper clubs, DIY noise shows, indie book readings, and micro-cinema screenings—never appear on conventional billboard ticketing platforms. They live buried in artisanal Linktrees, scattered across venue Instagram bios, scribbled on community flyers, or embedded in raw calendar markup.

**SideDoor** transforms this fragmented landscape into a live, intelligent discovery stream. It is an autonomous agentic system that continuously scouts the open web, extracts structured intelligence with sub-millisecond precision, streams real-time unearthings across global and private feeds via **Convex**, and autonomously conducts two-way ticket and venue policy inquiries with organizers via **AgentMail**.

---

## 🏗️ Architecture & Sponsor Integrations

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                     User Interface                      │
                                    │   • Studio (/main) — Private Session Scout Studio       │
                                    │   • Radar (/radar) — Global Unearthings Live Stream     │
                                    │   • Outbox Drawer — Real-Time Organizer Inbox & Threads │
                                    └───────────────────────────┬─────────────────────────────┘
                                                                │
                                            ┌───────────────────┴───────────────────┐
                                            ▼                                       ▼
                       ┌────────────────────────────────────────┐ ┌───────────────────────────────────┐
                       │            Next.js 16 Client           │ │      Convex Reactive Backend      │
                       │    (Zustand + MapLibre GL Map)         │ │   (events, threads, messages,     │
                       └───────────────────┬────────────────────┘ │            scoutRuns)             │
                                           │                      └─────────────────▲─────────────────┘
                                           ▼                                        │
                       ┌────────────────────────────────────────┐                   │
                       │            /api/scout Route            │                   │
                       │   (Dual-Engine Crawl Orchestration)    │                   │
                       └───────┬────────────────────────┬───────┘                   │
                               │                        │                           │
                               ▼                        ▼                           │
              ┌────────────────────────────────┐ ┌────────────────────────────────┐ │
              │      ⚡ Fast Scout Engine       │ │       🔬 Deep Scout Engine     │ │
              │   Single-pass Firecrawl search │ │  Gemini query planner + 3-lane │ │
              │     with raw HTML + Markdown   │ │   Firecrawl crawl & /map hubs  │ │
              └───────────────┬────────────────┘ └────────────────┬───────────────┘ │
                              │                                   │                 │
                              └─────────────────┬─────────────────┘                 │
                                                ▼                                   │
                               ┌──────────────────────────────────┐                 │
                               │   Two-Lane Hybrid Extractor      │                 │
                               │  Lane A: Deterministic JSON-LD   │                 │
                               │  Lane B: LLM Fallback (Gemini)   │                 │
                               │  Image: 4-Layer Flyer Harvester  │                 │
                               └────────────────┬─────────────────┘                 │
                                                ▼                                   │
                               ┌──────────────────────────────────┐                 │
                               │      Convex Real-Time Sync       │                 │
                               │  events:saveBatch & telemetry    ├─────────────────┘
                               └──────────────────────────────────┘                 │
                                                                                    │
                               ┌──────────────────────────────────┐                 │
                               │       AgentMail Integration      │                 │
                               │  • Outbound: /api/agent-mail/send│                 │
                               │  • Inbound: Webhook Receiver     ├─────────────────┘
                               │    syncs directly into Convex    │
                               └──────────────────────────────────┘
```

### 1. ⚡ Convex: The Reactive Heart & Real-Time Sync Engine
- **Global Event Stream**: Convex real-time subscriptions continuously feed the `/radar` global wire without manual polling.
- **Relational Messaging Architecture**: Normalized `threads` and `messages` tables coordinate autonomous two-way email communications between AI scouts and real-world venue curators.
- **Session-Private Studio Scoping**: Anonymous browser sessions index user queries while seamlessly sharing discoveries to the public collective knowledge base.
- **Indexing & Performance**: Custom indices on `events` (`by_category`, `by_matchScore`, `by_sourceUrl`, `by_sessionId`) and `threads` (`by_sessionId`, `by_session_and_event`, `by_agentmailThreadId`) guarantee sub-10ms query times.

### 2. 🕷️ Firecrawl: Multi-Lane Autonomous Deep Web Scouting
- **Dual-Engine Crawling**: Fast Single-Pass engine (~10s) vs Deep Parallel Crawl with Gemini query planning.
- **Calendar Hub Permalinks**: Traverses `/map` and calendar index permalinks to scrape underlying micro-event pages.
- **Hybrid Schema Extraction**: Combines deterministic Schema.org `Event` JSON-LD extraction (zero token cost) with Gemini structured LLM parsing for raw markdown fallback.
- **4-Layer Resilient Flyer Harvesting**: Scrapes OpenGraph, Twitter cards, Markdown image patterns, and verifies images server-side via `HEAD` checks before routing through an anti-hotlink image proxy (`/api/img`).

### 3. ✉️ AgentMail: Autonomous Two-Way Organizer Outreach
- **Automated Inquiry Generation**: Drafts and dispatches polite door-ticket, RSVP status, and dress-code inquiries directly to venue contacts.
- **Inbound Webhook Sync**: `POST /api/agent-mail/webhook` listens for incoming replies from human organizers, parses email payloads, and atomically appends them to Convex `messages` and `threads` records.
- **Instant UI Reactivity**: Live notifications and unread badges alert users instantly in the header when an organizer responds.

---

## ⏱️ Evidence-Based Build Log & Git Commit History

The repository was built from the ground up specifically for the Convex All Gas Hackathon across a disciplined, high-velocity engineering sequence. Every milestone is verifiable directly in git commit history:

### Phase 1: Foundation, Design Tokens & Core Layout
- `6f26f5e` **Initial commit from Create Next App**: Clean Next.js project bootstrap.
- `f1a3b01` **feat: initialize Next.js 16 with Turbopack, TS7, Tailwind v4, and Oxlint**: Configured Bun-native runtime, zero-warning Oxlint linter, and Rust LightningCSS.
- `5c19347` **docs: add AGENTS.md guidelines**: Established strict separation of concerns, page orchestrator pattern, and design system token invariants.
- `66fc64e` **feat: clean minimalist editorial mockup with Newsreader typography, cartographic map, and AgentMail hub**: Initial prototype of editorial aesthetic.
- `79ac790` **feat: implement minimalist Floating Dock UI from template, wire globals.css variables, and purge unused components**: Established central chat dock UI.
- `380f6c6` **refactor: tokenize theme & typography across components**: Enforced zero-arbitrary-color and zero-arbitrary-font rules across all components.
- `1c4cd98` **feat: adopt Bricolage Grotesque and Plus Jakarta Sans typography**: Integrated distinctive editorial font pairings.
- `cc6e2a7` & `e5c41a2` **feat: dynamic ambient canvas and dynamic shadow overlay**: Added GPU-accelerated atmospheric lighting.

### Phase 2: Geolocation, Location Anchor & MapLibre GL
- `ea2dd26` & `0fff310` **feat: add LocationAnchor with Locate Me GPS and first-party IP geolocation**: Implemented high-res auto-detect and reverse-geocoding autocomplete.
- `12d209b` & `83c096c` **fix: resolve SSR hydration mismatch & format clean city/state labels**: Resolved React 19 cascading hydration warnings.
- `7432115` & `3eb5e52` **feat: implement interactive MapLibre GL Location Pinning Modal**: Zero-key CartoDB dark tiles with dynamic radius circle projections.
- `4bab324` & `5f748aa` **feat: integrate Zustand stores & Framer Motion drawer animations**: Persistent state management for location and filter preferences.

### Phase 3: AI Intelligence & Firecrawl Discovery Pipeline
- `0929c48` **feat: integrate Vercel AI SDK with Google Gemini for 3-step Firecrawl discovery pipeline**: Structured `LocalEvent` extraction.
- `d21c5fb` **feat(ai): default to high reasoning effort for discovery & extraction**: Tuned temperature and system prompts for high-precision event parsing.
- `52d4793` & `9209b2c` **feat(scout): parallelize multi-query crawl, extract flyer art, and wire live scout API**: Live search execution with geo-anchoring.
- `1cb0bd9` & `4f12818` **feat(scout): temporal date anchoring, domain targeting, and Haversine distance calculations**: Hardened relative date resolution (e.g. "this Friday").
- `942d155` & `ceb3770` **feat(discovery): integrate two-lane hybrid scraping pipeline with Schema.org JSON-LD**: Instant zero-token deterministic extraction lane combined with deep LLM parsing.
- `ff4510c` & `f0d2e70` **feat(discovery): implement dual-engine fast vs deep scout modes with telemetry**: Introduced sub-15s Fast Mode alongside deep parallel exploration.
- `58e0748` **feat(images): implement resilient 3-layer flyer harvesting, proxy, and fallback system**: Server-side image health checks and same-origin proxy shielding.

### Phase 4: Convex Reactive Backend & Public Radar
- `cc78b4b` **feat: integrate Convex backend with anonymous session scoping (Phase 2)**: Added Convex tables (`events`, `threads`, `messages`, `scoutRuns`) and mutations.
- `ce82b3c` & `3aaed86` **feat: add Public Radar page and configure as global unearthings wire streaming from Convex**: Created dual-surface experience (`/main` Studio + `/radar` Public Wire).
- `0866c39` **refactor: eliminate regional bias for 100% dynamic global event scouting**: Universal coordinates, multi-country geocoding, and flexible currency parsing.
- `629ea3e` **feat: persist discovered events and agent mail correspondence across page refreshes**: Real-time Convex hydration.

### Phase 5: Live AgentMail Integration & Two-Way Webhooks
- `3cbe914` **feat(agentmail): wire real AgentMail integration with webhook sync**: Direct outbound email dispatch and inbound message routing.
- `3a82a4a` & `4525cd8` **fix(agentmail): remove simulation, dynamically resolve inbox, and enforce live dispatch**: Complete live SDK integration with automatic inbox allocation.
- `4d616fd` & `ccf67f0` **fix(mail): dynamically resolve agent email address and restore organizer inquiry triggers**: Seamless one-click inquiry modal from event dossiers.

### Phase 6: Polish, Sanitization, Batching & Robustness
- `9368cbb` & `048682f` **feat(discovery): supercharge fast mode with snippet mining and deduplication**: Streamlined crawl pipeline for optimal latency and coverage.
- `49baea4` **feat(scout): add Gemini Step-1 query refiner for high-signal Firecrawl calendar discovery**: Enhanced search intent translation.
- `01dbf56` **feat(geo): resolve true venue coordinates & add reactive distance recalculation**: Live distance updates as user moves or changes location pin.
- `69cfe71` & `e1ef42c` **fix: sanitize scraped HTML entities, validate event titles, and optimize curator geocoding**: Hardened data cleaning.
- `88a6cfb` & `033463f` **feat(discovery): add query batch dividers, batch dismissal, and batchId validator in Convex**: Clean UI batch segregation for consecutive scouting sessions.
- `d43d654` & `f437f4b` **perf & fix: optimize crawl limit, streamline geocoding, sanitize HTML tags, clean venue names, and reject table headers**: Production-grade data hygiene.

### Phase 7: Full-Stack Static Hosting Migration on Convex.site & Final Polish
- `04a12ef` **feat(hosting): migrate full-stack architecture to convex static hosting**: Transitioned all Next.js API routes to Convex Node Actions (`api.scout.run`, `api.agentMail.sendInquiry`), HTTP actions, and static export.
- `771914e` **feat(landing): add minimal and human editorial landing page**: Shipped immersive, typography-driven entrance view.
- `2447538` **feat: simplify floating dock UI and add natural language scout loader messages**: Refined discovery dock and multi-stage status indicators.
- `96cce4c` **fix(radar): remove hardcoded 100 limit on global events query**: Enabled full-table reactive streaming across all discovered gatherings.
- **Single Deployment Target**: Full-stack application deployed and hosted directly on `https://artful-octopus-475.convex.site`, eliminating any external hosting dependencies.

---

## 💎 Design System & Aesthetic Principles

SideDoor adheres to the **Monochromatic Editorial Ink** design system, combining timeless print typography with fluid, responsive micro-interactions:

- **Typography**: `Bricolage Grotesque` for dramatic editorial titles and `Plus Jakarta Sans` for clean, readable metadata and body copy.
- **Palette**: Strictly tokenized `--theme-bg-base` (`#F4F2EE`), `--theme-bg-surface` (`#FFFFFF`), `--theme-border-subtle` (`#E7E3DC`), and `--theme-text-primary` (`#191816`).
- **Cartography**: Dark-mode zero-key MapLibre GL integration with interactive radius circles and real-time pin snapping.
- **Micro-Interactions**: Ambient canvas light orbs, smooth Framer Motion drawers, and subtle skeleton loaders during multi-stage crawl execution.

---

## 🧪 Verification & Quality Standards

- **Runtime**: Strictly Bun-native execution (`bun --bun`).
- **Linting**: Oxlint verified with **0 errors and 0 warnings** across 74 source files.
- **Type Checking**: TypeScript 7 strict mode (`bunx tsc --noEmit`) passing with **0 errors**.
- **Production Build**: Next.js 16 Turbopack production compilation passing cleanly across all static pages and dynamic API routes.
- **Convex Schemas & Bindings**: Server code bundled, uploaded, and code-generated with complete TypeScript data models.

---

## 🎬 Submission Checklist & Demo Requirements

- [x] **Convex Real-Time Database**: Schema, queries, and mutations live and reactive.
- [x] **Firecrawl Scraping Engine**: Dual-mode crawl and two-lane hybrid extraction operational.
- [x] **AgentMail Inbox & Webhook**: Two-way email inquiry dispatch and real-time thread synchronization active.
- [x] **Public Git Repository**: Clean, fully tracked, and synchronized with `origin/main`.
- [x] **`hackathon.md`**: Fully detailed, evidence-based build log documenting architecture and git commit progression.
- [x] **Live Deployment**: Live and operational full-stack on Convex (`https://artful-octopus-475.convex.site`).
- [x] **Demo Video**: 3-minute presentation showcasing autonomous scouting, live Convex sync, and AgentMail correspondence ([`public/video/SideDoor-Demo.mp4`](https://github.com/1ewig/sidedoor-convex/raw/main/public/video/SideDoor-Demo.mp4)).
