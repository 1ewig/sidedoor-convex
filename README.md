# SideDoor — Autonomous Personal Scout for Local Gatherings

> *"The best things happening in any city this weekend aren't advertised on billboard ticket platforms. They're scribbled on DIY venue calendars, posted to small gallery websites, buried in artisan Instagram linktrees, or whispered by word of mouth."*

---

## ⚡ Agent Quickstart & Architecture Guide

This guide is designed for AI coding agents and human developers to understand the project structure, strict design system, data pipeline, reactive database, and autonomous email outreach in under 2 minutes.

### 1. The Core Stack (Strictly Bun-Native)
- **Runtime & Package Manager**: **Bun ONLY** (`bun`, `bun --bun`, `bun add`, `bun run`). Never use `npm`, `npx`, `yarn`, or `pnpm`.
- **Framework**: Next.js 16 (App Router + Turbopack).
- **Language**: TypeScript 7 (`strict` mode with native Go-based `tsgo` engine).
- **Styling**: Tailwind CSS v4 (Rust LightningCSS engine).
- **Linter**: Oxlint (Rust Oxc linter — zero-warning requirement).
- **AI & Web Crawling**: Google Gemini (`@ai-sdk/google` + `ai` SDK) & Firecrawl (`@mendable/firecrawl-js`).
- **Autonomous Outreach**: AgentMail (`agentmail` SDK) with direct outbound dispatch (`/api/agent-mail/send`) and inbound webhook sync (`/api/agent-mail/webhook`).
- **Reactive Database**: Convex (`convex/react` + `convex/server`) for real-time global wire sync, event persistence, email thread timelines, and scout run telemetry.
- **Client State**: Zustand (`zustand` with `persist` middleware) for optimistic client state and local filter preferences.
- **Interactive Maps**: MapLibre GL (`maplibre-gl`) with cartographic dark/light theme styling and GeoJSON radius projection.

---

## 🗺️ Project Directory Map

```
convex/                         # Convex reactive backend schema & mutations
├── schema.ts                   # Schema definitions (events, threads, messages, scoutRuns)
├── events.ts                   # Queries & batch mutation for scouted events
├── threads.ts                  # Reactive 2-way email thread queries & mutations
└── scoutRuns.ts                # Scout run telemetry logging

src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, ambient canvas styles, ConvexProvider)
│   ├── page.tsx                # Root redirect (/main)
│   ├── main/                   # Studio Scout page
│   │   ├── page.tsx            # Server entry point
│   │   └── page.client.tsx     # Client Orchestrator (scout dock, live feed, modal coordinator)
│   ├── radar/                  # Public Radar page
│   │   ├── page.tsx            # Server entry point
│   │   └── page.client.tsx     # Client Orchestrator (global wire query, search & filtering)
│   └── api/
│       ├── scout/route.ts      # Scout discovery endpoint (thin HTTP boundary)
│       ├── img/route.ts        # Same-origin image proxy (hotlink shield + SVG fallback)
│       ├── geocode/route.ts    # Nominatim forward/reverse geocoding
│       ├── locate/route.ts     # Browser geolocation → locality label
│       └── agent-mail/
│           ├── send/route.ts   # Outbound event inquiry dispatcher via AgentMail SDK
│           └── webhook/route.ts# Inbound reply webhook syncing to Convex reactive database
├── components/
│   ├── ui/                     # Atomic presentational primitives
│   │   └── EventImage.tsx      # Resilient flyer renderer (walks candidate URLs, fallback)
│   ├── layout/                 # Top-level layout elements
│   │   ├── Header.tsx          # Top bar with Studio/Radar tab switcher & outbox trigger
│   │   └── ShadowOverlay.tsx   # Atmospheric ambient leaf shadow animations
│   ├── location/               # Location picker & MapLibre GL
│   │   ├── LocationAnchor.tsx  # Interactive location pill & scouting base popover
│   │   └── LocationPinModal.tsx# MapLibre GL interactive pin & radius selector
│   ├── discovery/              # Core in-page discovery features
│   │   ├── FloatingDock.tsx    # Natural language scout prompt input & Fast/Deep toggle
│   │   ├── DiscoveredFeed.tsx  # Feed container & 2-column grid for scouted gatherings
│   │   ├── EventCard.tsx       # Modular event card (schema renderer)
│   │   └── EventDetailModal.tsx# Focused event dossier & AgentMail inquiry modal
│   ├── radar/                  # Public Radar components
│   │   ├── RadarHero.tsx       # Editorial headline for global radar stream
│   │   ├── RadarFilterBar.tsx  # Search input, tuning drawer trigger, & filter indicators
│   │   └── RadarGrid.tsx       # 2-column event grid for worldwide unearthings
│   ├── drawers/                # Slide-over overlay panels
│   │   ├── ScoutFilterDrawer.tsx # Search radius, categories, & vibe tuning
│   │   └── OutboxDrawer.tsx    # Two-way email outbox with venue organizers
│   └── providers/              # Context providers
│       └── ConvexClientProvider.tsx # Convex client provider with graceful offline fallback
├── hooks/                      # Business logic & side effects
│   ├── useEventDiscovery.ts    # Filter & scout trigger logic + Convex/Zustand sync
│   ├── useAgentMail.ts         # Outbox correspondence state & dispatch
│   ├── useUserLocation.ts      # Geolocation & reverse geocoding
│   ├── useLocationPinMap.ts    # MapLibre pin/radius side-effects
│   └── useLockBodyScroll.ts    # Modal scroll locking
├── state/                      # Zustand persistent stores
│   ├── index.ts                # Barrel re-exports
│   ├── useScoutFilterStore.ts  # Tuning filters (radius, category, minScore, scoutMode)
│   ├── useLocationStore.ts     # Active user coordinates & locality label
│   ├── useEventStore.ts        # Local scouted events & session feed open state
│   ├── useAgentMailStore.ts    # Local fallback thread state & active selection
│   └── useSessionStore.ts      # Browser session ID for multi-client separation
├── types/                      # Shared TypeScript definitions
│   ├── index.ts                # LocalEvent, Coordinates, EmailThread, etc.
│   └── discovery.ts            # CandidateEvent, ScrapedPageInput, HybridDiscoveryResult
└── lib/                        # Pure utilities & discovery pipeline
    ├── agent-mail/
    │   └── client.ts           # AgentMail client initializer & inbox resolver
    ├── discovery/              # Scout engine & two-lane hybrid pipeline
    │   ├── scout-engine.ts     # Fast/Deep crawl orchestration + page normalization
    │   ├── pipeline.ts         # Two-lane coordinator (Lane A + Lane B + curator)
    │   ├── query-planner.ts    # Gemini Step 1 intent → 3 targeted queries (Deep mode)
    │   ├── deep-lane.ts        # Lane B: Gemini unstructured markdown parser
    │   ├── curator.ts          # Semantic curator (matchScore, vibeTags, distance)
    │   ├── hub-resolver.ts     # Calendar-hub /map permalink deep-scraping
    │   ├── firecrawl-schema.ts # Plain JSON Schemas for Firecrawl extraction
    │   ├── prompts.ts          # Isolated system prompts (planner, deep-lane, curator)
    │   ├── category.ts         # Unified category classifier (text + schema @type)
    │   ├── filters.ts          # Pure event-vs-filter predicate
    │   ├── config.ts           # Model name, budgets, API-key resolution
    │   └── id.ts               # Monotonic candidate/event ID generation
    ├── images.ts               # Image harvesting, de-junking & validation (Layer 1)
    ├── schema-org.ts           # Lane A deterministic JSON-LD extractor
    ├── temporal.ts             # Deterministic date anchoring
    ├── html.ts                 # Pure HTML entity cleaning
    ├── geo.ts                  # Haversine distance + GeoJSON circle helpers
    ├── animations.ts           # Framer motion presets
    └── mapStyle.ts             # MapLibre cartographic styling
scripts/                        # Verification test suites & CLI tools
├── test-firecrawl.ts           # Web search, scrape & direct photo test
├── test-ai-queries.ts          # Step 1 Gemini intent expansion test
├── test-fast-pipeline.ts       # Fast-mode single-pass crawl harness
├── test-hybrid-pipeline.ts     # Two-lane hybrid scraping pipeline harness
└── test-search-cli.ts          # Terminal scout CLI runner (`bun run scout:cli`)
```

---

## 🎨 Strict Theme & Design Token Rules

Agents **MUST** follow these styling conventions. Arbitrary values and hardcoded colors are strictly prohibited:

### ❌ Prohibited
- **No hardcoded colors**: e.g., `#2D2721`, `bg-black/20`, `text-white`, `bg-emerald-500`.
- **No arbitrary font sizes**: e.g., `text-[10px]`, `text-[13px]`, `leading-[1.15]`.

### ✅ Required Tokens
Always use defined CSS custom properties:
- **Canvas & Surfaces**:
  - Base canvas: `bg-[var(--theme-bg-base)]` (`#F4F2EE`)
  - Floating card / dock: `bg-[var(--theme-bg-surface)]` (`#FFFFFF`)
  - Elevated / hover: `bg-[var(--theme-bg-elevated)]` (`#FAFAF8`)
  - Overlay: `bg-[var(--theme-bg-overlay)]` (`rgba(25, 24, 22, 0.4)`)
- **Borders**:
  - Subtle: `border-[var(--theme-border-subtle)]` (`#E7E3DC`)
  - Focused: `border-[var(--theme-border-strong)]` (`#D8D3C8`)
- **Typography & Ink**:
  - Primary text: `text-[var(--theme-text-primary)]` (`#191816`)
  - Secondary stone: `text-[var(--theme-text-secondary)]` (`#57534E`)
  - Muted captions: `text-[var(--theme-text-muted)]` (`#8C887F`)
- **Brand Accents**:
  - Primary brand: `text-[var(--theme-brand-primary)]` / `bg-[var(--theme-brand-primary)]` (`#10b981`)
  - Accent / hover: `text-[var(--theme-brand-accent)]` (`#059669`)
- **Typography Scale**:
  - `text-[var(--text-2xs)]` (12px), `text-[var(--text-xs)]` (14px), `text-[var(--text-sm)]` (16px), `text-[var(--text-base)]` (18px), `text-[var(--text-lg)]` (22px), `text-[var(--text-xl)]` (32px), `text-[var(--text-2xl)]` (48px), `text-[var(--text-3xl)]` (68px).
  - Fonts: `font-serif` (*Bricolage Grotesque*), `font-sans` (*Plus Jakarta Sans*), `font-mono`.

---

## 🛰️ Studio vs. Public Radar

SideDoor provides two unified views sharing identical container widths (`max-w-4xl`), serif/sans typography hierarchies, and responsive 2-column event grids:

1. **Studio (`/main`)**:
   - Natural language scout dock (`FloatingDock`) with engine mode toggles (⚡ Fast vs 🔬 Deep).
   - Live telemetry status and minimal result header (`Discovered Gatherings (N) · Fast Scout • 14.64s`).
   - Dynamic 2-column feed rendering newly unearthed gatherings with direct outbox inquiry actions.

2. **Public Radar (`/radar`)**:
   - Streams live gatherings curated across cities by autonomous scouts, queried directly from Convex.
   - Real-time client-side keyword search across titles, venues, addresses, and vibe tags.
   - Dynamic Haversine distance recalculation relative to the user's active GPS or pinned map location.

---

## 🚀 The Scout Pipeline (`src/app/api/scout/route.ts` → `src/lib/discovery/`)

SideDoor autonomously unearths underground gatherings through a **dual-engine scout** feeding a **two-lane hybrid extraction pipeline**.

### Scout Engines (`scout-engine.ts`)
The `/api/scout` route is a thin HTTP boundary that validates API keys, then delegates crawling to `executeScoutCrawl()`:

- **⚡ Fast mode** — a single laser-targeted Firecrawl search (`"<prompt> in <location> events calendar"`, limit 3) with markdown + rawHtml. Lowest latency (~10s).
- **🔬 Deep mode** — Gemini expands the user prompt into 3 targeted queries (venue calendars, markets/galleries, secret RSVPs), executes them in parallel with Firecrawl JSON-schema extraction, and resolves individual event permalinks from calendar hubs via `hub-resolver.ts` (`/map` + parallel `/scrape`).

All scraped pages are normalized by `normalizeScrapedPages()` into `ScrapedPageInput` (deduped URLs, harvested flyer candidate URLs, and optional structured JSON).

### Two-Lane Hybrid Extraction (`pipeline.ts`)
```
[Scraped Pages]
      │
      ▼
Lane A (deterministic)         Lane B (LLM fallback)
schema-org.ts JSON-LD    OR    deep-lane.ts Gemini parse
+ Firecrawl JSON schema        (pages without structured data)
      │                              │
      └──────────┬───────────────────┘
                 ▼
      curator.ts (Gemini) — matchScore, tagline, editorial
      overview, vibeTags, category, Haversine distance
                 ▼
      LocalEvent[] sorted by vibe-match score
```

Each curated `LocalEvent` carries: `title, category, tagline, description`, `venueName, address, distanceKm, coordinates`, `formattedDate, formattedTime, price, isFree`, `matchScore` (0–100 vibe match), `vibeTags`, `organizerName/organizerEmail` (for AgentMail outreach), and `coverImage` + ranked `coverImages` (flyers).

---

## ✉️ Autonomous AgentMail & Inbound Webhooks

SideDoor bridges digital discovery with real-world correspondence via [AgentMail](https://agentmail.to):

1. **Automated Inquiry Dispatch (`/api/agent-mail/send`)**:
   - Sends polite, autonomous door-ticket and venue-policy inquiries directly to organizers via `agentmail` SDK.
   - Inquires under the identity `scout-alpha@agentmail.to` (or auto-provisioned agent inboxes).
2. **Inbound Webhook Synchronization (`/api/agent-mail/webhook`)**:
   - Receives inbound replies from organizers and syncs them directly to Convex `messages` and `threads` tables.
   - Flips thread status to `responded`, alerting the user with unread notification badges in the navigation header.
3. **Outbox Drawer (`components/drawers/OutboxDrawer.tsx`)**:
   - Slide-over drawer displaying conversation history, thread statuses (`pending`, `responded`, `confirmed`), and manual follow-up message inputs.

---

## ⚡ Convex Real-Time Database Architecture

When connected to Convex via `NEXT_PUBLIC_CONVEX_URL`:
- **`events`**: Global table of scouted events indexed by `category`, `matchScore`, `sourceUrl`, and `sessionId`.
- **`threads` & `messages`**: Relational tables tracking agent-organizer email correspondence.
- **`scoutRuns`**: Telemetry table logging search prompts, mode, duration, and extracted counts.
- **`ConvexClientProvider`**: Handles real-time reactivity when configured, falling back to Zustand local state when running purely offline.

---

## 🖼️ The 4-Layer Resilient Image System

Event flyers come from untrusted third-party pages, so images flow through a hardened pipeline:

1. **Harvest & de-junk** (`lib/images.ts`) — extracts ranked candidate URLs (og:image → twitter:image → JSON-LD image → Firecrawl `imageUrl` → markdown images), resolving relative URLs and filtering tracking pixels/icons/SVGs.
2. **Validate** (`curator.ts` + `pickValidatedImage`) — top candidates are verified server-side via `HEAD` requests (200 + `image/*` + minimum byte size).
3. **Proxy shield** (`/api/img/route.ts`) — browser loads images through the same-origin proxy with a neutral identity to defeat hotlink protections.
4. **Resilient render** (`components/ui/EventImage.tsx`) — walks candidate URLs on `onError`, displays animated skeletons while loading, and falls back to a themed venue-initial placeholder if all candidates fail.

---

## 🛠️ Developer & Verification Commands

Run all tasks using **Bun**:

```bash
# Start local development server (Turbopack)
bun run dev

# Run Oxlint (strictly maintain 0 errors & 0 warnings)
bun run lint

# Run strict TypeScript 7 typecheck
bunx tsc --noEmit

# Production build test
bun run build

# Start Convex local development / sync
bun run convex:dev

# Test Suite: Direct Firecrawl search & photo extraction
bun run test:firecrawl

# Test Suite: Gemini Step 1 query generation
bun run test:ai

# Test Suite: Fast-mode single-pass crawl harness
bun run test:fast

# Test Suite: Two-lane hybrid scraping pipeline harness
bun run test:hybrid

# Interactive Terminal Scout CLI
bun run scout:cli
```

---

## Architecture Patterns for Agents

1. **Strict Separation of Concerns**:
   - UI components (`EventCard`, `DiscoveredFeed`, `Header`, `RadarGrid`) are dumb, presentational, and consume pure props.
   - Business logic, state, and side-effects reside inside custom hooks (`useEventDiscovery`, `useAgentMail`, `useUserLocation`).
   - The discovery engine is a thin API boundary (`/api/scout`) over pure, testable modules in `lib/discovery`.
2. **The Page Client Orchestrator Pattern**:
   - `page.tsx` is the server entry boundary.
   - `page.client.tsx` coordinates state, hooks, and delegates rendering to dumb feature components.
3. **Always Verify**:
   - After making changes, always run `bun run lint` and `bunx tsc --noEmit`.
