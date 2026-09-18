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
│   └── api/                    # Lightweight API route handlers (geocode, locate)
├── components/
│   ├── layout/                 # Header & Ambient Canvas overlays
│   │   ├── Header.tsx          # Top navigation bar & quick actions
│   │   └── ShadowOverlay.tsx   # Atmospheric ambient shadow animations
│   ├── location/               # Location picker & MapLibre GL
│   │   ├── LocationAnchor.tsx  # Interactive location pill & scouting base popover
│   │   └── LocationPinModal.tsx# MapLibre GL interactive pin & radius selector
│   ├── discovery/              # Core discovery features
│   │   ├── FloatingDock.tsx    # Natural language scout prompt input
│   │   ├── DiscoveredFeed.tsx  # Feed container for scouted gatherings
│   │   ├── EventCard.tsx       # Modular event card (schema renderer)
│   │   └── ScoutFilterDrawer.tsx # Search radius, categories, & vibe tuning
│   └── agent/                  # AgentMail correspondence
│       └── OutboxDrawer.tsx    # Two-way email outbox with venue organizers
├── hooks/                      # Business logic & side effects
│   ├── useEventDiscovery.ts    # Filter & scout simulation logic
│   ├── useAgentMail.ts         # Outbox correspondence state & dispatch
│   └── useUserLocation.ts      # Geolocation & reverse geocoding
├── state/                      # Zustand persistent stores
│   ├── useScoutFilterStore.ts  # Tuning filters (radius, category, minScore)
│   └── useLocationStore.ts     # Active user coordinates & locality label
├── types/                      # Shared TypeScript definitions
│   └── index.ts                # LocalEvent, Coordinates, EmailThread, etc.
└── lib/                        # Pure utilities & AI integrations
    ├── ai.ts                   # 3-Step Gemini 3.5 Flash Lite query & extraction
    ├── mockData.ts             # Initial curated gatherings & outbox threads
    ├── animations.ts           # Framer motion presets
    └── mapStyle.ts             # MapLibre cartographic styling
scripts/                        # Integration & verification test suites
├── test-firecrawl.ts           # Web search, scrape & direct photo test
├── test-ai-queries.ts          # Step 1 Gemini intent expansion test
└── test-pipeline.ts            # Full 3-step end-to-end extraction test
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

## 🚀 The 3-Step Discovery Pipeline (`src/lib/ai.ts`)

SideDoor autonomously finds DIY gatherings through a 3-step pipeline:

```
[User Natural Prompt] ("intimate indie gigs or flea markets near Bushwick")
          │
          ▼
1. Gemini 3.5 Flash Lite (`generateDiscoveryQueries`)
   Transforms broad intent into 3 laser-targeted Firecrawl queries:
   • Query 1: Specific Vibe & Genre calendar listings
   • Query 2: Local community board & popup format
   • Query 3: Underground ticket links (Luma, Dice, Linktree)
          │
          ▼
2. Firecrawl Web Crawl (`@mendable/firecrawl-js`)
   Searches the web, extracts metadata (`ogImage`), and turns raw venue HTML into clean markdown.
          │
          ▼
3. Gemini 3.5 Flash Lite (`extractEventsFromMarkdown`)
   Parses raw markdown into structured, UI-ready `LocalEvent` objects:
   • title, category, tagline, description
   • venueName, address, distanceKm, coordinates
   • formattedDate, formattedTime, price, isFree
   • matchScore (0–100% vibe match)
   • vibeTags (#IndieRock, #DIY, #Bushwick)
   • organizerName, organizerEmail (for AgentMail outreach)
   • coverImage (event flyer / photo)
```

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

# Test Suite: End-to-end 3-step discovery pipeline
bun run test:pipeline
```

---

## 🏛️ Architecture Patterns for Agents

1. **Strict Separation of Concerns**:
   - UI components (`EventCard`, `DiscoveredFeed`, `Header`) are dumb, presentational, and consume pure props.
   - Business logic, state, and side-effects reside inside custom hooks (`useEventDiscovery`, `useAgentMail`, `useUserLocation`).
2. **The Page Client Orchestrator Pattern**:
   - `src/app/main/page.tsx` is the server boundary.
   - `src/app/main/page.client.tsx` coordinates state, hooks, and delegates rendering to dumb feature components.
3. **Always Verify**:
   - After making changes, always run `bun run lint` and `bunx tsc --noEmit`.

