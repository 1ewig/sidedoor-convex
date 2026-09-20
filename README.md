# SideDoor — Autonomous Personal Scout for Local Gatherings

> *"The best things happening in any city this weekend aren't advertised on billboard ticket platforms. They're scribbled on DIY venue calendars, posted to small gallery websites, buried in artisan Instagram linktrees, or whispered by word of mouth."*

---

## ⚡ Agent Quickstart & Architecture Guide

This guide is designed for AI coding agents and human developers to understand the project structure, strict design system, and data pipeline in under 2 minutes.

### 1. The Core Stack (Strictly Bun-Native)
- **Runtime & Package Manager**: **Bun ONLY** (`bun`, `bun --bun`, `bun add`, `bun run`). Never use `npm`, `npx`, `yarn`, or `pnpm`.
- **Framework**: Next.js 16 (App Router + Turbopack).
- **Language**: TypeScript 7 (`strict` mode with native Go-based `tsgo` engine).
- **Styling**: Tailwind CSS v4 (Rust LightningCSS engine).
- **Linter**: Oxlint (Rust Oxc linter — zero-warning requirement).
- **AI & Scraping**: Google Gemini (`@ai-sdk/google` + `ai` SDK) & Firecrawl (`@mendable/firecrawl-js`).

---

## 🗺️ Project Directory Map

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, ambient styles)
│   ├── page.tsx                # Root redirect (/main)
│   ├── main/
│   │   ├── page.tsx            # Server entry point
│   │   └── page.client.tsx     # Main Client Orchestrator (state coordinator)
│   └── api/
│       ├── scout/route.ts      # Scout discovery endpoint (thin HTTP boundary)
│       ├── img/route.ts        # Same-origin image proxy (hotlink shield + placeholder)
│       ├── geocode/route.ts    # Nominatim forward/reverse geocoding
│       └── locate/route.ts     # Browser geolocation → locality label
├── components/
│   ├── ui/                     # Atomic, dumb presentational primitives
│   │   └── EventImage.tsx      # Resilient flyer renderer (walks candidates, placeholder)
│   ├── layout/                 # Header & ambient canvas overlays
│   │   ├── Header.tsx          # Top navigation bar & quick actions
│   │   └── ShadowOverlay.tsx   # Atmospheric ambient shadow animations
│   ├── location/               # Location picker & MapLibre GL
│   │   ├── LocationAnchor.tsx  # Interactive location pill & scouting base popover
│   │   └── LocationPinModal.tsx# MapLibre GL interactive pin & radius selector
│   ├── discovery/              # Core in-page discovery features
│   │   ├── FloatingDock.tsx    # Natural language scout prompt input
│   │   ├── DiscoveredFeed.tsx  # Feed container for scouted gatherings
│   │   ├── EventCard.tsx       # Modular event card (schema renderer)
│   │   └── EventDetailModal.tsx# Focused event dossier modal
│   └── drawers/                # Slide-over overlay panels
│       ├── ScoutFilterDrawer.tsx # Search radius, categories, & vibe tuning
│       └── OutboxDrawer.tsx    # Two-way email outbox with venue organizers
├── hooks/                      # Business logic & side effects
│   ├── useEventDiscovery.ts    # Filter & scout trigger logic
│   ├── useAgentMail.ts         # Outbox correspondence state & dispatch
│   ├── useUserLocation.ts      # Geolocation & reverse geocoding
│   ├── useLocationPinMap.ts    # MapLibre pin/radius side-effects
│   └── useLockBodyScroll.ts    # Modal scroll locking
├── state/                      # Zustand persistent stores
│   ├── index.ts                # Barrel re-exports
│   ├── useScoutFilterStore.ts  # Tuning filters (radius, category, minScore, mode)
│   └── useLocationStore.ts     # Active user coordinates & locality label
├── types/                      # Shared TypeScript definitions
│   ├── index.ts                # LocalEvent, Coordinates, EmailThread, etc.
│   └── discovery.ts            # CandidateEvent, ScrapedPageInput, HybridDiscoveryResult
└── lib/                        # Pure utilities & discovery pipeline
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
scripts/                        # Verification test suites
├── test-firecrawl.ts           # Web search, scrape & direct photo test
├── test-ai-queries.ts          # Step 1 Gemini intent expansion test
├── test-fast-pipeline.ts       # Fast-mode single-pass crawl harness
└── test-hybrid-pipeline.ts     # Two-lane hybrid scraping pipeline harness
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

## 🚀 The Scout Pipeline (`src/app/api/scout/route.ts` → `src/lib/discovery/`)

SideDoor autonomously finds DIY gatherings through a **dual-engine scout** feeding a **two-lane hybrid extraction pipeline**.

### Scout Engines (`scout-engine.ts`)
The `/api/scout` route is a thin HTTP boundary that validates env keys, then delegates crawling to `executeScoutCrawl()`:

- **⚡ Fast mode** — a single laser-targeted Firecrawl search (`"<prompt> in <location> events calendar"`, limit 3) with markdown + rawHtml. No LLM query expansion. Lowest latency.
- **🔬 Deep mode** — Gemini expands the intent into 3 targeted queries (venue calendars, markets/galleries, secret RSVPs), runs them in parallel with Firecrawl's JSON-schema extraction, then augments results by resolving event permalinks from detected calendar hubs (`hub-resolver.ts` via `/map` + parallel `/scrape`).

All scraped pages are normalized by `normalizeScrapedPages()` into `ScrapedPageInput` (deduped URLs, harvested image candidates, optional extracted JSON).

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

Each curated `LocalEvent` carries: `title, category, tagline, description`, `venueName, address, distanceKm, coordinates`, `formattedDate, formattedTime, price, isFree`, `matchScore` (0–100 vibe match), `vibeTags`, `organizerName/organizerEmail` (for AgentMail outreach), and `coverImage` + ranked `coverImages` (event flyers).

### 🖼️ The Image System (4 layers)
Event flyers come from untrusted third-party pages, so images flow through a hardened pipeline — the UI never shows a broken-image glyph:

1. **Harvest & de-junk** (`lib/images.ts`) — builds a ranked candidate list per event (og:image → twitter:image → JSON-LD image → Firecrawl `imageUrl` → markdown images), resolving relative URLs to absolute and filtering trackers/icons/logos/SVGs.
2. **Validate** (`curator.ts` + `pickValidatedImage`) — the top candidates are HEAD-checked server-side (200 + `image/*` + min byte size) so a verifiably real image leads the list.
3. **Proxy shield** (`/api/img/route.ts`) — the browser loads images through the same-origin proxy with a neutral identity (no cross-origin Referer), defeating hotlink protection; failures return a transparent placeholder, never an error.
4. **Resilient render** (`components/ui/EventImage.tsx`) — walks the ranked candidates on `onError`, shows a skeleton while loading, and falls back to a themed venue-initial placeholder when all candidates fail.

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

# Test Suite: Direct Firecrawl search & photo extraction
bun run test:firecrawl

# Test Suite: Gemini Step 1 query generation
bun run test:ai

# Test Suite: Fast-mode single-pass crawl harness
bun run test:fast

# Test Suite: Two-lane hybrid scraping pipeline harness
bun run test:hybrid
```

---

## Architecture Patterns for Agents

1. **Strict Separation of Concerns**:
   - UI components (`EventCard`, `DiscoveredFeed`, `Header`) are dumb, presentational, and consume pure props. Reusable dumb primitives live in `components/ui` (e.g. `EventImage` for resilient flyer rendering).
   - Business logic, state, and side-effects reside inside custom hooks (`useEventDiscovery`, `useAgentMail`, `useUserLocation`).
   - The discovery engine is a thin API boundary (`/api/scout`) over pure, testable modules in `lib/discovery` - crawl (`scout-engine`), extraction (`schema-org`, `deep-lane`), curation (`curator`), and shared helpers (`category`, `filters`, `prompts`, `images`).
2. **The Page Client Orchestrator Pattern**:
   - `src/app/main/page.tsx` is the server boundary.
   - `src/app/main/page.client.tsx` coordinates state, hooks, and delegates rendering to dumb feature components.
3. **Always Verify**:
   - After making changes, always run `bun run lint` and `bunx tsc --noEmit`.
