# SideDoor — Project Blueprint & Roadmap

> *"The best things happening in any city this weekend aren't advertised on billboard ticket platforms. They're scribbled on DIY venue calendars, posted to small gallery websites, buried in artisan Instagram linktrees, or whispered by word of mouth."*

---

## 1. The Core Idea (In Plain, Human Terms)

**SideDoor** is an autonomous personal scout for local culture and gatherings.

Instead of scrolling through five different event apps, Instagram flyers, and venue calendars, you simply tell SideDoor what kind of weekend you're looking for:

> *"Find me intimate indie rock basement gigs, outdoor vintage markets, or small gallery vernissages within 20 km of me this weekend."*

SideDoor goes to work as an autonomous scout:

1. **It scouts the web continuously**: Using **Firecrawl**, it crawls indie venue websites, underground band calendars, community noticeboards, and local newsletters to extract raw listings that traditional ticket platforms miss.
2. **It understands your vibe**: An AI model evaluates every discovered event against your exact tastes, scoring how well it matches what you asked for (e.g. `98% Vibe Match`) and writing a brief curator's note on why it's worth your time.
3. **It plots everything on a clean, calm map**: You get a serene cartographic view and an editorial index of what’s happening around you, filterable by distance, vibe, and price.
4. **It reaches out to organizers for you**: When an event is sold out online, has no clear schedule, or only mentions door tickets, you can ask SideDoor to contact the venue. Powered by **AgentMail**, SideDoor sends a polite email directly to the organizer from its own dedicated agent mailbox (`scout@sidedoor.agentmail.to`). When the organizer replies (*"Hey, yes! We're saving 30 tickets at the door for $15"*), the message streams straight back into your app in real time.

---

## 2. The Three Pillars of the Stack

```
 ┌────────────────────────────────────────────────────────┐
 │                      Next.js 16                        │
 │       Minimalist Editorial UI & Cartographic Index     │
 └──────────────────────────┬─────────────────────────────┘
                            │ (Convex React Hooks)
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │                    Convex Backend                      │
 │    • Real-time Database (events, queries, threads)     │
 │    • Scheduled Background Crons (continuous discovery) │
 │    • Convex Actions ("use node" for AI & Tool calling) │
 └─────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
 ┌──────────────────────────┐  ┌──────────────────────────┐
 │        Firecrawl         │  │        AgentMail         │
 │  • Search local sources  │  │  • Dedicated agent inbox │
 │  • Scrape venue markdown │  │  • Send organizer emails │
 │  • Extract event schema  │  │  • Realtime reply sync   │
 └──────────────────────────┘  └──────────────────────────┘
```

| Technology | What It Does for the User |
| :--- | :--- |
| **Convex** | Powers the live, reactive backbone. As soon as the crawler finds a new secret show or an organizer replies to an email, your screen updates instantly without refreshing. |
| **Firecrawl** | Acts as the scout's eyes. It bypasses messy web scraping by turning venue websites and DIY calendars into clean, LLM-ready markdown. |
| **AgentMail** | Acts as the scout's voice. Gives the agent a real email address to converse with real-world venue curators, booking agents, and market organizers. |
| **OpenAI / AI Engine** | Evaluates vibe compatibility, extracts structured dates/venues/prices from messy web copy, and drafts contextual emails. |

---

## 3. Step-by-Step Implementation Roadmap

### Phase 1: Interactive Editorial Prototype (Completed)
- [x] Warm paper minimalist editorial design system with **Newsreader** serif typography.
- [x] Interactive cartographic map with numbered pins and perimeter controls.
- [x] Editorial natural language prompt bar with curated inquiry links.
- [x] AgentMail correspondence hub simulation with two-way thread previews.
- [x] Field notes / crawler terminal drawer.
- [x] Zero-warning Oxlint + strict TypeScript 7 foundation.

---

### Phase 2: Convex Backend & Schema Setup
- [ ] Initialize Convex in the repository (`bun add convex`).
- [ ] Define the reactive schema in `convex/schema.ts`:
  - `queries`: User intent prompts, search radius, filter preferences.
  - `events`: Title, category, venue, coordinates, date/time, price, vibe tags, match score, source URL, organizer contact info.
  - `inboxes`: AgentMail mailbox configurations.
  - `threads` & `messages`: Two-way email communications between agent and event organizers.
  - `scoutRuns`: Audit logs of Firecrawl discovery passes.
- [ ] Connect Next.js App Router with `ConvexClientProvider`.

---

### Phase 3: Firecrawl Discovery Pipeline & AI Scoring
- [ ] Build Convex Action `convex/scout.ts`:
  - Uses Firecrawl search API to discover local venue pages and DIY event listings for a given query and city/coordinates.
  - Uses Firecrawl scrape API to pull raw markdown.
  - Prompts OpenAI / LLM to extract structured event data and compute a 0–100% vibe match score.
  - Writes new events to the Convex `events` table in real time.
- [ ] Set up a Convex cron schedule to run periodic background discovery passes.

---

### Phase 4: AgentMail Two-Way Outreach Integration
- [ ] Build Convex Action `convex/agentMail.ts`:
  - Create and manage programmatic agent mailboxes via AgentMail API (`agentmail` SDK).
  - Dispatch contextual inquiries to venue organizers (*"Are door tickets held for walk-ups?"*, *"What are set times?"*).
  - Store sent dispatches in the Convex `messages` table.
- [ ] Set up Convex HTTP Action / Webhook endpoint (`convex/http.ts`) to receive incoming replies from AgentMail and push them straight into the user's thread view.

---

### Phase 5: Polish, Live Deployment & Hackathon Submission
- [ ] Create `hackathon.md` documenting architecture, setup prompts, and build logs.
- [ ] Deploy frontend to Vercel and backend to Convex production.
- [ ] Record a 3-minute project walkthrough video demonstrating:
  1. Typing a natural language discovery prompt.
  2. Live events appearing reactively on the map via Firecrawl.
  3. Clicking "Contact Organizer" to dispatch an AgentMail inquiry.
  4. Receiving an organizer reply directly in the app.
- [ ] Submit public repo & live URL to the Convex All Gas Hackathon portal.
