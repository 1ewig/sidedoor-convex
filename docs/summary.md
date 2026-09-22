# SideDoor — Technical Project Summary & System Architecture

## 1. Executive Summary & Vision

**SideDoor** is an autonomous, AI-powered personal scout designed to unearth underground, community-driven, and DIY cultural gatherings that bypass commercial billboard ticketing aggregators. The platform uncovers intimate loft concerts, warehouse art vernissages, independent culinary pop-ups, zine fairs, and late-night listening sessions buried across decentralized venue calendars, artist linktrees, local flyers, and social feeds.

SideDoor pairs high-precision autonomous web search and multimodal scraping with a two-lane extraction pipeline, structured schema mining, LLM-driven semantic curation, real-time reactive data synchronization, and autonomous email outreach via AI mailboxes.

---

## 2. Core Technology Stack

SideDoor is engineered strictly around a **Bun-native** modern web ecosystem:

| Layer | Technology | Key Details |
| :--- | :--- | :--- |
| **Runtime & PM** | **Bun** (v1.4+) | Strictly Bun-native execution (`bun`, `bun --bun`, `bun add`, `bun run`); zero npm/yarn/pnpm footprint. |
| **Framework** | **Next.js 16** | App Router with Turbopack bundler, React 19 Server/Client boundaries, streaming, and API route handlers. |
| **Language** | **TypeScript 7** | Strict type safety with native Go-based `tsgo` engine, zero `any` leakage in contracts, and end-to-end schema validation. |
| **Styling & Tokens** | **Tailwind CSS v4** | Powered by Rust LightningCSS engine; strictly tokenized via CSS custom properties. |
| **Linter** | **Oxlint** | High-performance Rust-based Oxc linter enforcing zero errors and zero warnings. |
| **Reactive Database** | **Convex** | Real-time reactive WebSocket-synced data layer for events, email correspondence threads, messages, and telemetry. |
| **AI / LLM Engine** | **Google Gemini** | `@ai-sdk/google` & `ai` SDK running `gemini-3.5-flash-lite` for structured query refinement, Lane B extraction, and culture curation. |
| **Web Crawling** | **Firecrawl** | `@mendable/firecrawl-js` for search execution, markdown/rawHtml ingestion, and anti-bot bypass. |
| **Outreach Mail** | **AgentMail** | `agentmail` SDK for autonomous organizer inquiry dispatch and inbound webhook reply synchronization. |
| **Client State** | **Zustand** | `zustand` with `persist` middleware for filter tuning, active location, session ID isolation, and offline fallback. |
| **Cartography** | **MapLibre GL** | `maplibre-gl` with custom cartographic dark/light canvas styling, dynamic pin dragging, and GeoJSON radius projection. |

---

## 3. System Architecture & Component Topology

SideDoor maintains a strict **Separation of Concerns** separating presentational UI from data operations, side-effects, and reactive stores:

```
src/
├── app/                        # Next.js 16 App Router (RSC entry + Client Orchestrators)
│   ├── layout.tsx              # Ambient theme canvas, font definitions & ConvexClientProvider
│   ├── page.tsx                # Root redirect (/main)
│   ├── main/                   # Studio Scout (/main) — Page entry & Client Orchestrator
│   ├── radar/                  # Public Radar (/radar) — Page entry & Client Orchestrator
│   └── api/                    # Thin HTTP API Boundaries
│       ├── scout/route.ts      # Multi-stage discovery pipeline endpoint
│       ├── img/route.ts        # Same-origin flyer image proxy & hotlink shield
│       ├── geocode/route.ts    # Nominatim forward/reverse geocoding
│       ├── locate/route.ts     # Geolocation to locality label resolver
│       └── agent-mail/         # Outbound dispatch (/send) & Inbound webhook (/webhook)
├── components/                 # Presentational (Dumb) Components
│   ├── ui/                     # EventImage flyer renderer, badges, buttons, modal wrappers
│   ├── layout/                 # Header, nav tabs, shadow overlay animations
│   ├── discovery/              # FloatingDock, DiscoveredFeed, EventCard, EventDetailModal
│   ├── radar/                  # RadarHero, RadarFilterBar, RadarGrid
│   ├── location/               # LocationAnchor, LocationPinModal (MapLibre GL)
│   ├── drawers/                # ScoutFilterDrawer, OutboxDrawer (AgentMail threads)
│   └── providers/              # ConvexClientProvider (reactive sync + offline graceful fallback)
├── hooks/                      # Business Logic & Custom Hooks
│   ├── useEventDiscovery.ts    # Scout trigger, Convex batch mutations, client filtering & stats
│   ├── useAgentMail.ts         # Outbox correspondence state, email dispatch & unread counts
│   ├── useUserLocation.ts      # Geolocation tracking, reverse geocoding & manual overrides
│   ├── useLocationPinMap.ts    # MapLibre map initialization, marker drag, and radius GeoJSON
│   └── useLockBodyScroll.ts    # Modal and drawer scroll management
├── state/                      # Zustand Persistent Stores
│   ├── useScoutFilterStore.ts  # Tuning parameters (radiusKm, category, minScore, mode, when)
│   ├── useLocationStore.ts     # User coordinates, locality label, and country code
│   ├── useEventStore.ts        # Client-side scouted events, telemetry logs, and active selection
│   ├── useAgentMailStore.ts    # Fallback correspondence threads and selected thread state
│   └── useSessionStore.ts      # Cryptographic browser session UUID for multi-client isolation
├── lib/                        # Pure Utilities & Discovery Engine
│   ├── discovery/              # Scout engine, query refiner, extraction, curator & geocoder
│   ├── agent-mail/             # AgentMail client singleton & inbox provisioner
│   ├── schema-org.ts           # Lane A deterministic JSON-LD extractor & graph flattener
│   ├── images.ts               # 4-layer flyer image harvesting, de-junking & HEAD validation
│   ├── temporal.ts             # Deterministic calendar anchoring & weekend window calculation
│   ├── geo.ts                  # Spherical Haversine distance & GeoJSON circle geometry
│   ├── html.ts                 # HTML entity decoding & sanitization
│   └── mapStyle.ts             # MapLibre vector style definitions
└── convex/                     # Convex Reactive Backend
    ├── schema.ts               # Database schema (events, threads, messages, scoutRuns)
    ├── events.ts               # Queries, indexed lookups, batch upserts, outreach updates
    ├── threads.ts              # Two-way email correspondence queries & inbound mutations
    └── scoutRuns.ts            # Scout execution telemetry and pipeline logging
```

---

## 4. Dual-View Interface Architecture

SideDoor delivers two coordinated user experiences built on shared design primitives:

1. **Studio Scout (`/main`)**:
   - Focuses on user-directed discovery via natural language prompt input (`FloatingDock`).
   - Supports contextual timeframe filters (`this weekend`, `today`, `this week`, `this month`, `anytime`).
   - Renders live progress logs, telemetry metrics (structured vs. unstructured candidate counts, crawl duration, curation time), and an expandable 2-column feed (`DiscoveredFeed`).
   - Enables one-click organizer inquiry drafting via AgentMail in the event detail modal (`EventDetailModal`).

2. **Public Radar (`/radar`)**:
   - Acts as a live cultural wire streaming unearthings across cities worldwide, queried directly from Convex (`api.events.list`).
   - Features client-side keyword search across event titles, venue names, addresses, descriptions, and aesthetic vibe tags.
   - Dynamic Haversine distance recalculation updates distances in real-time as users shift their location pin or GPS coordinates.

---

## 5. The Autonomous Discovery Pipeline

The discovery engine coordinates web scraping, structured parsing, and LLM curation through a multi-stage flow:

```
User Prompt + Location + Time Window
               │
               ▼
   [ Step 1: Query Refiner ] (Gemini 3.5 Flash Lite)
   Transforms natural language into targeted venue calendar search query + vibe tags
               │
               ▼
    [ Step 2: Scout Engine ] (Firecrawl API)
    Fast single-pass search (limit 3) with in-memory TTL caching & backoff
               │
               ▼
      [ Raw Scraped Pages ]
               │
      ┌────────┴──────────────────────────┐
      ▼                                   ▼
 [ Lane A: Deterministic ]      [ Lane B: LLM Fallback ]
 Schema.org JSON-LD parser      Gemini unstructured markdown
 + Heuristic Snippet Mining     extractor (only if Lane A < 3)
      │                                   │
      └────────┬──────────────────────────┘
               │
               ▼
   [ Cross-Domain Deduplication & Richness Merging ]
   Fuzzy title token similarity + date/venue matching + field coalescence
               │
               ▼
    [ Step 3: Semantic Curator ] (Gemini 3.5 Flash Lite)
    Match scores (50-100), punchy taglines, editorial atmosphere overviews,
    aesthetic vibe tags, category classification & venue email inference
               │
               ▼
   [ Image Harvesting & Validation ] (Layer 1 + HEAD Checks)
               │
               ▼
 [ Batch Persistence to Convex ] (events, scoutRuns tables)
```

### Pipeline Details:
- **Lane A (Deterministic)**: Extracts Schema.org `Event`, `@graph`, and `ItemList` JSON-LD data with zero LLM inference latency. Also executes heuristic listing mining over text blocks and calendar segments.
- **Lane B (LLM Fallback)**: Activates `extractFromUnstructuredMarkdown` with Gemini only when Lane A yields fewer than 3 candidates, preventing unnecessary latency and API cost.
- **Deduplication & Richness Merging**: Employs token Jaccard similarity and date/venue matching to merge duplicate records, preserving the richest available cover image, organizer email, and address.
- **Temporal Anchoring**: `temporal.ts` deterministically resolves dynamic phrases like "this weekend" against the current reference date, anchoring search scopes accurately.

---

## 6. The 4-Layer Resilient Image System

Because flyers originate from unstandardized third-party web sources, SideDoor uses a 4-layer defense pipeline:

1. **Harvest & De-Junk (`lib/images.ts`)**: Collects candidates from `og:image`, `twitter:image`, JSON-LD `image`, Firecrawl `imageUrl`, and markdown image references. Excludes tracking pixels, 1x1 GIFs, SVGs, favicon assets, and relative links.
2. **Server-Side Validation (`pickValidatedImage`)**: Performs rapid `HEAD` checks (with 1-byte ranged `GET` fallbacks) enforcing HTTP 200, valid `image/*` MIME type, and minimum byte size (5KB) within a 1200ms timeout.
3. **Same-Origin Proxy Shield (`/api/img/route.ts`)**: Proxies remote images through a secure route handler with clean browser headers to bypass third-party hotlink restrictions.
4. **Resilient UI Renderer (`components/ui/EventImage.tsx`)**: The client component sequentially walks ranked candidate URLs on image error, rendering animated skeletons during loading and falling back to a deterministic typography monogram on complete failure.

---

## 7. Autonomous AgentMail & Two-Way Webhook Architecture

SideDoor closes the loop between event discovery and real-world attendance through autonomous email communication:

```
[ User Clicks "Inquire via Scout" ]
               │
               ▼
 POST /api/agent-mail/send ─────────► AgentMail API Dispatch
               │                              │
               ▼                              ▼
 Convex `threads` & `messages`        Venue Organizer Inbox
 (Status: "pending")                          │
                                              │ (Organizer replies)
                                              ▼
 Convex `threads` updated ◄────────── POST /api/agent-mail/webhook
 (Status: "responded")
               │
               ▼
 Reactive Badge Notification in Header & OutboxDrawer
```

- **Outbound Dispatch (`/api/agent-mail/send`)**: Resolves organizer contact info from event metadata, source domain heuristics (`info@<domain>`), or venue name sanitization, dispatching polite inquiries from the agent's provisioned inbox.
- **Inbound Webhook (`/api/agent-mail/webhook`)**: Ingests incoming organizer replies via AgentMail webhooks, parses sender details and body content, and commits new messages into Convex `messages` while updating thread status to `responded`.
- **Outbox Drawer (`components/drawers/OutboxDrawer.tsx`)**: Displays full multi-turn conversational threads, message timelines, and allows users to dispatch manual follow-up replies.

---

## 8. Convex Reactive Backend & State Topology

SideDoor uses Convex as a real-time reactive data spine with four core tables:

- **`events`**: Stores discovered gatherings indexed by `by_category`, `by_matchScore`, `by_sourceUrl`, and `by_sessionId`. Upserts are idempotent based on `sourceUrl`.
- **`threads`**: Manages email correspondence threads indexed by `by_sessionId`, `by_session_and_event`, and `by_agentmailThreadId`.
- **`messages`**: Stores individual incoming and outgoing correspondence messages indexed by `by_threadId`.
- **`scoutRuns`**: Tracks telemetry logs including search prompt, location, duration, and structured vs. unstructured discovery counts.
- **Offline / Standalone Fallback**: When `NEXT_PUBLIC_CONVEX_URL` is omitted or offline, `ConvexClientProvider` and `useEventDiscovery` gracefully degrade to Zustand local storage without application disruption.

---

## 9. Design System & Tokenization Constraints

SideDoor adheres to strict design system guidelines configured in Tailwind CSS v4:

- **Canvas & Surfaces**: Base canvas (`--theme-bg-base`: `#F4F2EE`), Surface cards (`--theme-bg-surface`: `#FFFFFF`), Elevated cards (`--theme-bg-elevated`: `#FAFAF8`), Overlay (`--theme-bg-overlay`).
- **Typography Hierarchy**: Editorial Serif (*Bricolage Grotesque* / `--font-serif`), Sans body (*Plus Jakarta Sans* / `--font-sans`), Monospace metadata (`--font-mono`).
- **Typography Scale**: Standardized scale tokens from `--text-2xs` (12px) to `--text-3xl` (68px) with strict line-height pairings (`--leading-tight`, `--leading-snug`, `--leading-normal`, `--leading-relaxed`).
- **Borders & Accents**: `--theme-border-subtle`, `--theme-border-strong`, `--theme-brand-primary` (`#10b981`), `--theme-brand-accent` (`#059669`).
- **Strict Prohibition**: Hardcoded hex values, arbitrary pixel typography sizes (e.g. `text-[10px]`), and raw utility colors are strictly prohibited across all components.

---

## 10. Verification & Quality Assurance Commands

All testing, linting, type-checking, and build tasks are executed through Bun:

```bash
# Start local development server with Turbopack
bun run dev

# Run Oxlint (enforcing 0 errors and 0 warnings)
bun run lint

# Run strict TypeScript 7 typecheck
bunx tsc --noEmit

# Test production build
bun run build

# Start Convex development watcher & codegen
bun run convex:dev

# Test Suites & Verification Harnesses
bun run test:firecrawl       # Direct Firecrawl search & photo extraction
bun run test:fast            # Fast-mode single-pass crawl harness
bun run scout:cli            # Interactive terminal-based scout CLI
```
