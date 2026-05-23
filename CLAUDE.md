# Gymmie — Agent Instructions

## Style

Caveman mode on. Always. Drop articles, filler, pleasantries, hedging. Fragments OK. Abbrev: DB/auth/config/req/res/fn/impl. Technical terms exact. Code blocks unchanged.

- Direct impl after reading codebase.
- No reverting user changes unless asked.
- Small reviewable commits/slices.
- Ambiguous task → inspect repo/docs first, ask only blocking question.

## Context Workflow

1. Read this file.
2. Read `CONTEXT.md` for domain language.
3. Architecture/refactor/nav → read `graphify-out/GRAPH_REPORT.md` before raw search.
4. Source search: `rg` / `rg --files`.
5. Library-specific code → Context7 first, else official docs.

## Graphify

Graph at `graphify-out/`. Read `GRAPH_REPORT.md` for god nodes before spelunking.
If `graphify-out/wiki/index.md` exists, use it first.
After meaningful refactors: `graphify update .`

Key hubs: workout state mutations · API error taxonomy · calendar date utils · workout CRUD clients · exercise catalog seeding · exercise library filters · progress chart state · workout aggregates · API envelope reader · calendar dashboard · workout detail modal

## Architecture

- Stack: Vite + TanStack Start/Router + React 19 + Tailwind v4 (`@tailwindcss/vite`) + Bun
- Target: Vercel + Supabase (Postgres + Supabase Auth + RLS)
- Exercise media: jsDelivr URLs from public dataset
- API responses: shared envelope unless route is redirect
- Private routes: derive authed user server-side. Never trust `userId` from query/body.

Docs: `CONTEXT.md` · `docs/supabase-vercel-migration-plan.md` · `docs/adr/` · `graphify-out/GRAPH_REPORT.md`

## Source Layout

- `src/app/components` — app shell (header, error boundary)
- `src/components/ui` — shared UI primitives
- `src/features/*` — feature-first UI/model/client
- `src/lib/api` — envelopes, route helpers, error handling
- `src/lib/supabase` — clients, generated types, seed helpers
- `src/routes` — TanStack route files, server/API boundaries
- `supabase/migrations` — Postgres schema + RLS
- `scripts` — smoke + ops scripts

## Styling

Read `.agent/skills/styling/SKILL.md` before touching UI.

- Mobile-first. Gym use on mobile.
- Touch targets ≥ 44px.
- Tailwind utilities inline; extract only when reused ≥3×.
- Static class strings only — no dynamic Tailwind construction.
- Clickable things look + behave clickable (`cursor-pointer`).
- Preserve gradient direction unless asked to remove.
- No nested cards or oversized marketing layouts on dashboard surfaces.

## Deployment

Target: Vercel + Supabase. Not Zo Sites.
Zo rejected: requires SQLite→Postgres rewrite, TanStack Start removal, Hono API, auth adaptation.

Migration phases: runtime readiness → Supabase baseline → Postgres schema → RLS → auth → data access → exercise seed + jsDelivr → verify + cutover.

## Commands

```bash
bun run dev | format | lint | test | build | smoke
```

Pre-handoff after code/config changes:
1. `bun run format`
2. `bun run lint`
3. Focused tests for touched behavior
4. `bun run build`
5. `bun run smoke` if routing/API changed

Can't run a check → say why.

## Git

- Check `git status --short --branch` first.
- No destructive git ops without explicit request.
- Migration work on separate branch from `master`.
- Coherent commit slices.

## Data

- No dirty SQLite DB uploads to prod.
- No mock users in prod.
- Exercise seed: explicit + repeatable.
- Exercise images/GIFs from jsDelivr, not committed.
- Local DB files stay gitignored.

## API + Auth

- Preserve route response shapes during migration unless contract change is intentional.
- Contract tests for route/req/res behavior.
- Private workout data scoped by authed user server-side.
- Supabase RLS = auth boundary for private tables.

## Testing

- Data/auth/routing changes → focused tests before broad refactors.
- UI changes → key workflows + mobile layout.
- Smoke tests for route/API regressions.
- Report lint warnings, don't hide.
