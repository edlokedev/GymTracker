# Supabase and Vercel Migration Plan

## Decisions

- Use Supabase Auth as canonical auth.
- Use Supabase Postgres as production database.
- Keep TanStack server routes as the first compatibility boundary.
- Use local Supabase CLI plus a linked remote Supabase project.
- Preserve current API response shapes during the first backend migration pass.
- Treat existing local workout data in this test worktree as disposable.
- Store small user preferences in `profiles`; no separate `user_preferences` table for first migration.
- Serve exercise catalog images through jsDelivr links derived from Free Exercise DB paths; do not add Supabase Storage for first migration.

## Target Architecture

Browser clients authenticate with Supabase Auth. Private app calls go through TanStack server routes, which derive the authenticated user from the Supabase session or bearer token. Server routes query Supabase Postgres and return the existing response shapes. Row Level Security remains enabled on private tables so the database enforces ownership.

Public exercise catalog reads can move to direct Supabase reads after the private workout path is stable.

## Migration Slices

### 1. Vercel Runtime Readiness

- Add Nitro Vite plugin required for TanStack Start deployment on Vercel.
- Remove `define` injection for individual secrets from `vite.config.ts`; use runtime server environment access instead.
- Add production env contract for Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET` only if server-side JWT verification needs it directly
  - production site URL for auth redirects
- Configure Google OAuth redirect URLs in Supabase Auth and Vercel.

### 2. Supabase Project Baseline

- Initialize Supabase folder with CLI.
- Start local Supabase stack.
- Link remote Supabase project.
- Add migration files under `supabase/migrations`.
- Add repeatable seed path for exercise catalog.
- Generate TypeScript database types into `src/lib/supabase/database.types.ts`.

### 3. Postgres Schema Migration

- Convert SQLite schema to Postgres:
  - `user` auth-owned fields move to Supabase `auth.users` plus app `profiles`.
  - `profiles` stores display metadata, `weight_unit`, and `theme`.
  - `exercise_categories` stays public catalog table.
  - `exercises` stays public catalog table.
  - `workout_sessions` becomes private user-owned table.
  - `workout_sets` stays private through session ownership.
- Replace SQLite JSON text conventions with `jsonb` for muscle arrays, instructions, and images.
- Convert exercise image paths such as `Air_Bike/0.jpg` to jsDelivr URLs during catalog seeding or response mapping.
- Replace local string id generation with `uuid` defaults where practical.
- Preserve column names only where doing so reduces migration risk.

### 4. RLS Policy Migration

- Enable RLS on all public schema tables.
- Exercise catalog:
  - anon/authenticated can read.
  - writes denied to anon/authenticated.
  - service role handles seed/admin writes.
- Profiles:
  - users can read/update only their own profile.
- Workout sessions:
  - users can CRUD only rows where `user_id = auth.uid()`.
- Workout sets:
  - users can CRUD only sets whose parent workout session belongs to them.

### 5. Auth Migration

- Add Supabase browser client.
- Add Supabase server client/JWT helper for TanStack server routes.
- Replace Better Auth context with Supabase Auth context while preserving `useAuth()` shape where possible.
- Replace sign-in/sign-out flows with Supabase Google OAuth.
- Remove Better Auth routes after parity is proven.

### 6. Data Access Migration

- Create Supabase query modules behind existing route contracts.
- Port route internals in this order:
  1. exercise catalog read routes
  2. auth/session derivation
  3. workout session CRUD
  4. workout set CRUD
  5. workout detail/calendar aggregate routes
  6. progress aggregate route
- Remove `userId` from trusted request input on private routes.
- Keep response JSON shape stable until UI tests pass.

### 7. Seed and Data Migration

- Seed exercise catalog from current `src/lib/database/data/exercises.json`.
- Build image URLs from `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/` plus each relative image path.
- Keep Supabase Storage out of scope unless the catalog source disappears, CDN use becomes unreliable, or custom/private exercise images become a feature.
- Do not build SQLite export/import during the first test-worktree migration.
- Use new Supabase Auth test users and throwaway workout data for parity checks.
- For production cutover, write one import script only after schema and auth mapping are stable.

### 8. Verification and Cutover

- Local verification:
  - Supabase local stack starts.
  - migrations apply from empty DB.
  - seed loads exercise catalog.
  - RLS tests prove cross-user reads/writes fail.
  - focused route tests pass.
- Preview verification:
  - Vercel preview deploy builds.
  - Supabase OAuth callback works.
  - workout create/edit/delete works.
  - calendar and progress data match seeded test data.
- Production cutover:
  - freeze local SQLite writes if migrating real data.
  - import data.
  - verify owner mapping.
  - switch production env vars.

## Open Questions

1. Should aggregate routes use SQL views/RPC functions after compatibility is stable?

## First Implementation Pass

1. Add Supabase and Nitro dependencies.
2. Add Supabase CLI scaffold and initial SQL migration.
3. Add RLS policy tests or SQL smoke scripts.
4. Add Supabase client/server helpers.
5. Port exercise catalog routes.
6. Port auth context.
7. Port workout session and set routes.
8. Port aggregate routes.
9. Remove Better Auth and SQLite only after route parity.
