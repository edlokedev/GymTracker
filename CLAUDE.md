# Gymmie — Agent Instructions

## Style

Caveman mode on. Always. Drop articles, filler, pleasantries, hedging. Fragments OK. Abbrev: DB/auth/config/req/res/fn/impl. Technical terms exact. Code blocks unchanged.

- Direct impl after reading codebase.
- No reverting user changes unless asked.
- Small reviewable commits/slices.
- Ambiguous task → inspect repo/docs first, ask only blocking question.
- **UI tasks → clarify with AskUserQuestion before writing code.** State transitions, empty states, loading states, mobile behavior — ask first. Never assume.

## Context Workflow

1. Read this file.
2. Read `CONTEXT.md` for domain language.
3. Code nav/understanding → `graphify-out/wiki/index.md` first, then `graphify-out/GRAPH_REPORT.md`. Raw `rg` only when graph doesn't resolve it.
4. Library-specific code → Context7 first, else official docs.

## Graphify

Graph at `graphify-out/`. **Always use graph before raw search.**
- `wiki/index.md` → entry point for file/feature lookup
- `GRAPH_REPORT.md` → god nodes, communities, coupling hotspots

Run `graphify update .` after:
- New feature added or existing feature significantly restructured
- Route/API shape changed
- Auth or DB layer modified
- ≥5 files touched in one task

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

## Shell — HARD RULES

- **Bash tool only. `PowerShell` tool is BANNED (hook blocks it).**
- **Every command must use `rtk` prefix** — a hook now enforces this: `rtk git status`, `rtk bun run test`, `rtk bunx tsc --noEmit`. Unprefixed `git`/`bun run`/`bunx` = blocked.
- Exceptions (no rtk needed): `bun install`, `bun add`, `bun remove`, `bun --version`.
- If `rtk: command not found` → `export PATH="$USERPROFILE/bin:$PATH"` then retry.
- **No `/tmp` on Windows** — use `process.stdin` piping or `$USERPROFILE/AppData/Local/Temp`.
- **No `python3`/`python`** — use `node -e` instead.
- **Node stdin pattern**: `cmd | node -e "const c=[]; process.stdin.on('data',d=>c.push(d)); process.stdin.on('end',()=>{ const d=JSON.parse(Buffer.concat(c).toString()); ... })"`
- **Dev server stop (Windows)**: `taskkill //F //IM node.exe 2>/dev/null; true` — reliable one-liner. Don't use `kill $(lsof -ti:3000)` on Windows.

## Commands

```bash
rtk bun run dev | format | lint | test | build | smoke
```

Pre-handoff after code/config changes:
1. `rtk bun run format` — then `rtk git diff --name-only` and revert churn: `rtk git checkout -- <unrelated-files>`
2. `rtk bun run lint`
3. Focused tests for touched behavior
4. `SERVER_PRESET=vercel rtk bun run build`
5. `rtk bun run smoke` if routing/API changed

Can't run a check → say why.

## Git

- Check `rtk git status --short --branch` first.
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
