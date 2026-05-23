# Claude Instructions - Gymmie

This repo is the Gymmie fitness tracker. Follow these rules before changing code.

## Default Style

- Be concise and technical. No filler.
- Prefer direct implementation after reading the codebase.
- Do not revert user changes unless explicitly asked.
- Use small, reviewable commits/slices for migrations and refactors.
- If a task is ambiguous, inspect repo/docs first, then ask only the blocking question.

## Required Context Workflow

1. Read this file.
2. Read `CONTEXT.md` for domain language.
3. For architecture, refactor, or codebase navigation, read `graphify-out/GRAPH_REPORT.md` before broad searching.
4. Prefer `rg` / `rg --files` for source search.
5. Use current framework/library docs when changing library-specific code:
   - Context7 if available.
   - Otherwise official docs only.

## Graphify

This project has a graphify knowledge graph at `graphify-out/`.

Rules:
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure.
- If `graphify-out/wiki/index.md` exists, navigate it before raw file spelunking.
- After meaningful code refactors, refresh graphify when practical with:

```bash
graphify update .
```

Current graph hubs to know:
- Workout state mutations
- API error taxonomy
- Calendar date utilities
- Workout CRUD clients
- Exercise catalog seeding
- Exercise library filters
- Progress chart state
- Workout aggregates and formatting
- API envelope reader
- Calendar dashboard
- Workout detail modal

## Current Architecture

- App name: `Gymmie`
- Runtime/build: Vite + TanStack Start/Router + React 19.
- Styling: Tailwind v4 via `@tailwindcss/vite`.
- Backend migration direction: Vercel + Supabase.
- Auth target: Supabase Auth.
- Database target: Supabase Postgres.
- Exercise media target: jsDelivr URLs from the public exercise dataset.
- API responses should use the shared API envelope unless route is a redirect.
- Private routes must derive the authenticated user server-side; do not trust `userId` from request query/body.

Important docs:
- `CONTEXT.md`
- `docs/supabase-vercel-migration-plan.md`
- `docs/adr/`
- `graphify-out/GRAPH_REPORT.md`

## Source Layout

- `src/app/components` - app shell UI like header/error boundary.
- `src/components/ui` - shared UI primitives.
- `src/features/*` - feature-first UI/model/client code.
- `src/lib/api` - API envelopes, route helpers, error handling.
- `src/lib/supabase` - Supabase clients, generated types, seed/data helpers.
- `src/routes` - TanStack route files and server/API route boundaries.
- `supabase/migrations` - Postgres schema/RLS migrations.
- `scripts` - smoke and operational scripts.

## Styling Rules

Use `.agent/skills/styling/SKILL.md` when touching UI.

Key rules:
- Mobile-first. Main usage is at the gym on mobile.
- Touch targets should be at least `44px`.
- Prefer Tailwind utilities directly in JSX for one-off styling.
- Extract repeated patterns only when reused at least 3 times or clearly shared.
- Keep class strings static; avoid dynamic Tailwind class construction.
- Keep clickable things visually and behaviorally clickable, including `cursor: pointer`.
- Preserve the modern gradient direction unless the user asks to remove it.
- Avoid nested cards and oversized marketing-style layouts for dashboard/tool surfaces.

## Deployment Direction

The current preferred path is Vercel + Supabase, not Zo Sites.

Reason:
- Zo requires a larger runtime rewrite: `better-sqlite3`/SQLite runtime changes, TanStack Start removal, Hono API, auth adaptation.
- Vercel + Supabase moves the app toward durable production architecture instead of platform-specific compromises.

Migration plan summary:
1. Vercel runtime readiness.
2. Supabase project baseline.
3. Postgres schema migration.
4. RLS policy migration.
5. Supabase auth migration.
6. Data access migration behind existing route contracts.
7. Exercise catalog seed and jsDelivr media URLs.
8. Verification and cutover.

## Commands

Use Bun where possible.

```bash
bun run dev
bun run format
bun run lint
bun run test
bun run build
bun run smoke
```

Before final handoff after code/config changes, run:

1. `bun run format`
2. `bun run lint`
3. Focused tests for touched behavior
4. `bun run build`
5. `bun run smoke` when app routing/API behavior changed

If a check cannot run, say why.

## Git Safety

- The user may have uncommitted changes. Check `git status --short --branch` first.
- Do not use destructive git commands unless explicitly requested.
- Keep migration work on a separate branch from `master`.
- Commit in coherent slices.

## Data Rules

- Do not upload local dirty SQLite DB files as production data.
- Do not seed mock users in production.
- Exercise catalog seed should be explicit and repeatable.
- Exercise images/GIFs should be served from jsDelivr, not committed into the app repo.
- Local generated DB files stay ignored.

## API and Auth Rules

- Preserve route response shapes during migration unless intentionally changing a contract.
- Use contract tests for route/request/response behavior where possible.
- Private workout data must be scoped by authenticated user server-side.
- Supabase RLS is the target authorization boundary for private tables.

## Testing Bias

- For data/auth/routing changes, prefer focused tests before broad refactors.
- For UI changes, test key workflows and mobile layout.
- Use smoke tests for route/API regressions.
- Existing lint warnings should be reported, not hidden.
