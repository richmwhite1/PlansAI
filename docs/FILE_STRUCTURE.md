# Plans AI File Structure Map

This document outlines the organization of the codebase as of the "Architecture & Core Features" phase.

## Directory Overview

```
plans/
├── src/
│   ├── app/                      # Next.js 15 App Router
│   ├── components/               # React components
│   └── lib/                      # Utilities and backend logic
├── prisma/                       # Database schema and migrations
├── public/                       # Static assets
└── docs/                         # Architecture documentation
```

## Detailed Breakdown

### 1. App Router (`src/app/`)

**Pages & Layouts**
- `layout.tsx`: Root layout with providers and global styles.
- `page.tsx`: The "Dynamic Dashboard" (Main creation flow).
- `hangouts/[slug]/page.tsx`: The "Hangout Detail" page (Voting, Coordination).

**API Routes**
- `/api/ai/suggest-activities`: AI recommendation engine endpoint.
- `/api/events/search`: Unified search (Cache + Google Places).
- `/api/hangouts/create`: Hangout creation logic.
- `/api/hangouts/[hangoutId]/status`: Lightweight polling for real-time updates.
- `/api/hangouts/[hangoutId]/vote`: Voting submission endpoint.

### 2. Components (`src/components/`)

**Dashboard (Creation Flow)**
- `dashboard-engine.tsx`: Main state machine for the "Who -> What -> When" flow.
- `friend-selector.tsx`: UI for adding participants.
- `activity-suggestions.tsx`: AI-driven activity cards with "Pulse" effect.

**Hangout Experience**
- `hangout-voting.tsx`: Interactive voting cards with real-time polling.

**UI Primitives**
- `ui/avatar.tsx`: User avatar component.
- *(More Shadcn UI components to be added as needed)*

### 3. Library (`src/lib/`)

**Core Logic**
- `ai/trust-score.ts`: The "Trust Score" algorithm implementation.
- `cache/event-cache.ts`: Service for managing `CachedEvent` records.
- `google-places.ts`: Client for the Google Places API.

**Utilities**
- `prisma.ts`: Singleton instance of Prisma Client.
- `utils.ts`: Helper functions (e.g., `cn` for Tailwind class merging).

---

## Key Patterns

- **API-First**: Complex logic resides in API routes or `lib/`, keeping UI components focused on presentation and state.
- **Client/Server Split**: 
  - `page.tsx` files are Server Components by default.
  - Interactive features (Voting, Dashboard) are Client Components (`"use client"`).
- **Service Layer**: Database and external API interactions are encapsulated in `lib/` modules (e.g., `event-cache.ts`) rather than inline in routes.
