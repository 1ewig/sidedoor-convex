<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Architecture & Agent Guidelines

## 1. Environment & Package Management (Bun Native)
- **Runtime & PM**: Strictly **Bun-native**. Use `bun`, `bun --bun`, `bun add`, `bun remove`, and `bun run`.
- **Prohibited**: Never use or propose `npm`, `npx`, `yarn`, or `pnpm`.
- **Tooling Stack**:
  - Next.js 16 (App Router + Turbopack)
  - TypeScript 7 (Native Go-based `tsgo` engine)
  - Tailwind CSS v4 (Rust LightningCSS engine)
  - Oxlint (Rust Oxc linter)

---

## 2. Architecture & Code Structure

### The Core Rule: Strict Separation of Concerns
Never mix business logic, asynchronous data fetching, and state management directly inside presentational (dumb) UI components.

### Directory Structure Convention
```
src/
├── app/                      # Next.js App Router
│   └── [route]/
│       ├── page.tsx          # Server Component entry point (metadata, RSC data fetching)
│       └── page.client.tsx   # Client Orchestrator component
├── components/
│   ├── ui/                   # Atomic, dumb presentational components (buttons, inputs, cards)
│   └── [feature]/            # Feature-specific dumb UI components
├── hooks/                    # Reusable custom hooks (business logic, queries, mutations)
├── state/                    # State management (stores, contexts, atomics)
├── types/                    # Shared TypeScript types & interfaces
└── lib/                      # Pure utilities, helper functions, API clients
```

---

## 3. The Page Client Orchestrator Pattern

Every interactive page must follow the **Orchestrator Pattern**:

1. **`page.tsx` (Server Entry)**:
   - Handles page metadata, server-side data prefetching (if applicable), and server constraints.
   - Renders the corresponding `PageClient` component.

2. **`page.client.tsx` (Main Orchestrator)**:
   - Marked with `'use client'`.
   - **Role**: Acts as the single coordinator for the view.
   - Invokes custom hooks, retrieves state, handles event handlers/callbacks.
   - Distributes data and action callbacks down to dumb UI components via typed props.
   - Does **not** contain extensive raw JSX styling trees directly; it delegates rendering to modular UI components.

3. **Dumb / Presentational UI Components**:
   - Pure, stateless (or UI-only micro-state like accordion/popover open states).
   - Consume pure props (e.g. `items`, `isLoading`, `onSelect`, `onSubmit`).
   - Highly reusable, easily testable, and isolated from global state and side-effects.

---

## 4. State Management & Hooks Guidelines
- Extract any non-trivial state logic, side-effects, timers, and data operations into custom hooks (`useFeatureData`, `useFeatureActions`, etc.).
- Keep components declarative: UI components declare *what* to render based on props, while hooks/orchestrators manage *how* state evolves.
- Avoid prop-drilling by providing clean context boundaries or targeted store slices when state spans deep component subtrees.

---

## 5. Quality & Performance Verification
- **Linting**: Always use `bun run lint` (Oxlint). Keep rules clean and zero-warning.
- **Type Checking**: Run `bunx tsc --noEmit` (TypeScript 7). Ensure strict typing throughout.
- **Builds**: Verify with `bun run build` (Turbopack).
