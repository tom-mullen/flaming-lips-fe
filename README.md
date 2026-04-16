# Flaming Lips — Frontend

The frontend for a music rights management platform. Built on Next.js 16 (App Router) and talks to a Go API for all data operations. Authenticates via Auth.js v5 against Google, Microsoft Entra ID, and Spotify.

---

## What it does

The app manages the lifecycle of musical works, the rights attached to them, and the documents that evidence those rights.

- **Catalogs** — top-level groupings of works and the rights attached to them. Each catalog has a status (`evaluating`, `declined`, `acquired`).
- **Works** — canonical compositions, identified by title, artist, and ISWC. Each work can have many recordings (specific masters/performances) and many aliases (title/artist variants observed across sources).
- **Recordings** — specific masters of a work, identified by ISRC and optionally enriched with Spotify metadata (artwork, preview URL, popularity, release date).
- **Releases** — commercial products (albums, singles, EPs) linked to recordings via a many-to-many relationship (with track/disc positions).
- **Rights** — ownership/license claims over a work within a catalog. Typed (`producer`, `copyright`, `neighbouring`, `distribution`) and optionally scoped to a territory and date range.
- **Documents** — uploaded evidence (royalty statements, contracts, miscellaneous) associated with a catalog.

Three main user flows:

1. **Analyze** — drag and drop files (or zips), assign them to a catalog with default rights, upload via a resumable tus protocol, then watch the server extract and classify documents in real time.
2. **Enrich** — paste track identifiers (Spotify ID, ISRC, or name + artist) and look them up against Spotify to confirm metadata before adding as works.
3. **Catalog management** — browse catalogs, inspect their works and rights, add/remove rights, and review source documents.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS 4** with `class-variance-authority` for component variants |
| UI primitives | Headless UI, Heroicons |
| Auth | **Auth.js v5** (beta) — Google, Microsoft Entra ID, Spotify |
| Server state | **TanStack Query v5** with `@lukemorales/query-key-factory` |
| Client state | **Zustand** (session persistence for the Analyze flow) |
| File uploads | **Uppy** headless (`@uppy/core` + `@uppy/tus`) |
| Dates | `react-day-picker` |
| WebSockets | `reconnecting-websocket` (job + upload event streams) |
| Linting/formatting | ESLint + Prettier (`prettier-plugin-tailwindcss`) |

> **Note:** Next.js 16 has breaking changes from earlier versions (see `AGENTS.md`). Always consult `node_modules/next/dist/docs/` before writing new code — conventions like `middleware.ts` have moved (this project uses `proxy.ts` at the project root).

---

## Design principles

### Headless UI, owned styling

We use Headless UI for accessibility primitives (dialogs, tabs, listboxes, disclosures) but style everything ourselves with Tailwind. No component library, no opinionated theme. This keeps the design system small and intentional.

### CVA for variants

Buttons, badges, cards, and alerts use `class-variance-authority`. Variants (`primary`, `secondary`, `danger`, sizes, etc.) are declared once and surfaced as typed props. See `app/components/ui/button.tsx` for the pattern.

### Dark-first, canvas / surface / border semantics

Tailwind custom color tokens (`bg-canvas`, `bg-surface`, `bg-surface-alt`, `text-muted`, `text-dimmed`, `border-border-subtle`, etc.) replace the usual `bg-gray-900` sprawl. Colors are defined once in `app/globals.css`.

### React Query as the server-state source of truth

All API calls go through typed hooks in `app/lib/queries/`. Query keys are centralized via `@lukemorales/query-key-factory` in `app/lib/queries/keys.ts` so invalidations stay consistent. Components never call `fetch` directly.

### Zustand only for session-scoped state

Client-only state (e.g. the Analyze wizard's resumable session bookmark) lives in Zustand stores with `sessionStorage` persistence. Everything else is derived from server state.

### Auth.js v5, JWT session strategy

We avoid the database adapter. Instead, Auth.js v5 issues a JWT session, and on each request we mint a short-lived HS256 token for the Go API (`auth.ts` `session` callback). The Go API trusts that HMAC signature — no shared DB required.

### Client/server boundary

Almost every page is a client component (`"use client"`) because most pages use React Query. Server components are used sparingly (e.g. the root `app/page.tsx` login screen reads `searchParams`).

---

## Architecture

```
app/
├── (authenticated)/          # Route group protected by proxy.ts
│   ├── layout.tsx            # Wraps children in <Shell />
│   ├── dashboard/
│   ├── catalogs/
│   │   └── [id]/             # Catalog detail (Rights tab + Documents tab)
│   ├── works/                # Work list + create/delete
│   ├── analyze/              # Upload wizard (drop → assign → upload → import → done)
│   └── enrich/               # Spotify track lookup
├── api/auth/[...nextauth]/   # Auth.js route handler
├── components/               # Shared UI (track-card, work-card, rights-fields, shell)
│   └── ui/                   # Pure presentational primitives (Button, Badge, Card, etc.)
├── lib/
│   ├── api.ts                # fetch wrapper, bearer token storage, WebSocket URL builder
│   ├── types.ts              # All domain types (Work, Recording, Right, Page<T>, etc.)
│   ├── constants.ts          # Enum lists and visual mappings
│   ├── hooks/                # useJobStream, useEnrichJob
│   └── queries/              # React Query hooks (one file per resource)
├── globals.css               # Tailwind + custom color tokens
└── layout.tsx                # Root layout — AuthProvider, QueryProvider, ErrorBoundary

auth.ts                       # Auth.js config + bearer token minting for Go API
proxy.ts                      # Protected route redirect (Next.js 16 replacement for middleware.ts)
```

### Key architectural notes

- **Protected routes use `proxy.ts`**, not `middleware.ts`. In Next.js 16, the middleware convention has been renamed. The `proxy.ts` file redirects unauthenticated users from protected routes to `/`.
- **The Go API is the authority for all persistence.** This frontend owns no data — it renders, validates, and dispatches.
- **WebSockets carry long-running job events.** All job progress — including upload extraction, parsing, ingestion, and enrichment — streams through `/jobs/{id}/stream`. Consumers attach via the shared `useJobStream` hook. The stream authenticates via a `?jwt=<token>` query param because the browser WebSocket API cannot set custom headers.

---

## Complexities worth knowing

### Auth.js v5 on a non-standard dev domain

We run dev on a custom subdomain (`tm-localhost.standard-innovation.com`) so that Spotify's OAuth redirect URIs can point to a stable host. Because this isn't `localhost`, Auth.js v5 requires `trustHost` to be enabled — but only in development:

```ts
// auth.ts
trustHost: process.env.NODE_ENV === "development",
```

In production, Auth.js validates the request `Host` header against `AUTH_URL`. Without this conditional, you'll get `InvalidCheck: pkceCodeVerifier value could not be parsed` on the OAuth callback.

### JWT bearer token for the Go API

The Auth.js session callback (`auth.ts`) mints a fresh HS256-signed JWT on every session read, using the same `AUTH_SECRET` as the Go API. This token is attached as `Authorization: Bearer <token>` to every API request via the `setAccessToken`/`getAccessToken` helpers in `app/lib/api.ts`.

### Resumable uploads via Uppy + tus

The Analyze flow uses Uppy's headless API with the tus protocol. The server exposes `/uploads/tus` for resumable upload and `/uploads/stream/{batchId}` as a WebSocket for extraction events. Pause/resume/cancel are wired to Uppy's own methods — see `app/(authenticated)/analyze/upload-step.tsx`. Uploads survive page navigation because Uppy persists state, and the Analyze wizard's Zustand store (`app/(authenticated)/analyze/store.ts`) bookmarks the step and batch so users can return to an in-progress session.

### WebSocket auth in the browser

Because the browser WebSocket API cannot set custom headers, the bearer token is passed as a query parameter (`wsUrl()` in `app/lib/api.ts`). The Go API's auth middleware accepts the JWT from header, query, or cookie — whichever is present.

### Paginated API responses

All list endpoints return a `Page<T>` shape (`{ items: T[], next_cursor?: string }`) rather than a flat array. React Query hooks extract `.items` at the call site. When adding a new list endpoint, use the `Page<T>` generic from `app/lib/types.ts`.

### Environment variables: three similar URLs

| Variable | Used by | Value | Notes |
|---|---|---|---|
| `AUTH_URL` | Next.js (server) | Frontend origin | Used by Auth.js for OAuth redirects and cookie scoping |
| `NEXT_PUBLIC_API_URL` | Next.js (browser) | Go API origin | Prefixed to every fetch in `lib/api.ts` — embedded in the browser bundle |
| `FRONTEND_URL` (on the API side) | Go API | Frontend origin | CORS allow-list |

`AUTH_URL` and `FRONTEND_URL` usually hold the same value but are kept separate because they're semantically different concerns (the web's own origin vs. the API's trusted origin).

---

## Getting started

### Prerequisites

- **Node 20+** and npm
- **Go API** running locally (see the companion repo). Default port: `8080`.
- **1Password CLI** (`op`) if using the team's shared dev secrets via `.env.op`. Optional — you can use a plain `.env.local` instead.
- **OAuth app credentials** for at least one provider (Google / Microsoft / Spotify) if you want to test login end-to-end.

### Install

```bash
npm install
```

### Environment variables

Copy the example and fill in values:

```bash
cp .env.local.example .env.local
```

Required:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
AUTH_URL=http://localhost:3000
AUTH_SECRET=<openssl rand -base64 33>
AUTH_GOOGLE_ID=<from Google Cloud Console>
AUTH_GOOGLE_SECRET=
AUTH_MICROSOFT_ENTRA_ID_ID=
AUTH_MICROSOFT_ENTRA_ID_SECRET=
AUTH_SPOTIFY_ID=
AUTH_SPOTIFY_SECRET=
```

> `AUTH_SECRET` **must** be the same value used by the Go API — that's how the API validates the bearer token we mint.

### 1Password-backed secrets (recommended)

If you use 1Password, secrets can be injected at runtime instead of stored on disk.

1. **Create a 1Password item** named `flaming-lips-fe` in any vault you choose, with these fields:
   - `AUTH_SECRET` — Auth.js secret (must match the Go API)
   - `SPOTIFY_CLIENT_ID` — Spotify OAuth client ID
   - `SPOTIFY_CLIENT_SECRET` — Spotify OAuth client secret
   - `NEXT_PUBLIC_API_URL` — Go API origin
   - `AUTH_URL` — frontend origin

2. **Configure your local overrides**:
   ```bash
   cp .env.op.local.example .env.op.local
   # Edit .env.op.local and set OP_ACCOUNT and OP_VAULT
   ```

3. **Run**:
   ```bash
   npm run dev:op
   ```

This uses `scripts/dev-with-op.sh` to render `.env.op` against your vault and pipe it through `op run` to `next dev`. No secrets are ever written to disk.

> `.env.op` (the template with `op://` references) is committed. `.env.op.local` (your personal account/vault config) is gitignored.

### Run dev server

```bash
npm run dev
```

Opens on [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (reads `.env.local`) |
| `npm run dev:op` | Start dev server with secrets from 1Password (reads `.env.op.local` + `.env.op`) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

TypeScript is not run automatically — use `npx tsc --noEmit` for a full type check.

---

## Deployment

Any Next.js-compatible host (Vercel, Fly, Cloud Run, self-hosted Node). When deploying:

- Set `AUTH_URL` to your production frontend origin.
- Set `NEXT_PUBLIC_API_URL` to your production Go API origin.
- Set all `AUTH_*` provider credentials and `AUTH_SECRET`.
- Register the callback URL (`${AUTH_URL}/api/auth/callback/<provider>`) with each OAuth provider.
- The Go API's `FRONTEND_URL` env var must match `AUTH_URL` exactly (CORS).

---

## Contributing

- Changes go through feature branches and PRs on `main`.
- Prettier runs on save (the repo includes `.prettierrc`). Run `npx prettier -w .` before committing if you aren't using an editor integration.
- Before pushing, run a full type check: `npx tsc --noEmit`.
- Never commit `.env*` files — they're gitignored for a reason.
