# Deploying GymTracker to Vercel with Supabase

This guide walks through provisioning Supabase, applying schema and seed data,
configuring Google OAuth, and deploying the app to Vercel. It assumes you have
the Supabase CLI (`supabase --version`), Node 20+, and a Vercel account.

## 1. Provision a Supabase project

1. Sign in to <https://supabase.com> and create a new project.
2. Pick a strong database password and the closest region.
3. From **Settings → API Keys**, note these values — you will paste them into
   Vercel later. Supabase moved to a new key naming convention in 2026; the
   legacy `anon` / `service_role` JWTs still appear under a "Legacy" tab but
   prefer the new keys for new projects:
   - `Project URL`              → `SUPABASE_URL` and `VITE_SUPABASE_URL`
   - `Publishable key` (`sb_publishable_…`)
                                → `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `Secret key` (`sb_secret_…`)
                                → `SUPABASE_SECRET_KEY` (server-only)

   (The legacy env-var names `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
   are still read as fallbacks by `src/lib/env.ts` if your project hasn't
   rotated yet.)

## 2. Apply database migrations

From the repo root:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

`db push` applies every file under `supabase/migrations/` to the linked remote
project. Re-run it whenever you add new migrations.

## 3. Seed the exercise catalog

The catalog seeder uses the secret key, so it must be run from a trusted
machine (your laptop or CI), never from the browser.

```bash
# PowerShell
$env:SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SECRET_KEY = "sb_secret_..."
npm run supabase:seed-exercises

# bash/zsh
export SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SECRET_KEY="sb_secret_..."
npm run supabase:seed-exercises
```

The seeder is idempotent — running it twice should not duplicate rows.

## 4. Configure Google OAuth on Supabase

GymTracker's Better Auth setup already has a Google OAuth client. Reuse the
same Client ID / Client Secret here:

1. Supabase dashboard → **Authentication → Providers → Google**.
2. Enable the provider and paste the existing `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`.
3. Under **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel domain (e.g. `https://gymtracker.vercel.app`).
   - Add **Redirect URLs**:
     - `https://<your-vercel-domain>/auth/callback`
     - `http://localhost:3000/auth/callback`
4. In Google Cloud Console, add the same two URLs as **Authorized redirect URIs**
   on the OAuth client. Supabase's docs explain the full PKCE flow if you need
   a primer.

## 5. Configure the Vercel project

1. Import the GitHub repo into Vercel. Vercel will detect a Vite project — that
   is fine, the bundled `vercel.json` overrides framework detection so the
   TanStack Start Nitro build wins.
2. Open **Settings → Environment Variables** and add the values from
   `.env.example`. Mark each one with the environments you want it in
   (Production, Preview, Development).

   Secrets — store as **Encrypted** (the default):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `BETTER_AUTH_SECRET`

   Public (read by the browser bundle) — also Encrypted is fine; the
   `VITE_` prefix means Vite inlines them at build time:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SITE_URL` — set to the public domain (`https://...`).

   Build target:
   - `SERVER_PRESET=vercel`

   Do **not** set `DATABASE_URL` on Vercel — the SQLite path will not work in
   a serverless environment and is only used by the legacy code paths locally.

## 6. Deploy

Push to your default branch (or click **Deploy** in the Vercel UI). Once the
build succeeds, browse to the deployed URL and run through the Google sign-in
flow. The callback should land at `/auth/callback` and bounce you to `/` with
an authenticated session cookie set.

## 7. Known incomplete — read before going to production

The Supabase migration is being landed in slices. As of this commit:

- **Better Auth + SQLite are still in the repo.** `src/lib/auth/config.ts`,
  `src/lib/auth/client.ts`, `src/lib/auth/context.tsx`, and the `/api/auth/*`
  routes still wire up Better Auth against `better-sqlite3`.
- **`better-sqlite3` does not run on Vercel** — it is a native module that
  cannot be compiled for the serverless runtime. Any request that hits the
  legacy Better Auth handlers or the old query layer will crash in production.
- The new `SupabaseAuthProvider` (`src/lib/auth/supabase-context.tsx`) is
  exported but **not yet wired into `src/routes/__root.tsx`**. Wiring it in
  is intentionally left as the integrator's flip step.

Path forward to make production safe:

1. Wire `<SupabaseAuthProvider>` into `__root.tsx` in place of `<AuthProvider>`.
2. Update `Header.tsx` / `GoogleLoginButton.tsx` to import `useSupabaseAuth`
   instead of `useAuth`.
3. Land the data-access stream (workout sessions / sets / aggregates) on
   Supabase Postgres.
4. Delete `src/lib/auth/{config,client,context,index}.ts`, the
   `src/routes/api/auth*` routes, `src/lib/database/`, and remove
   `better-auth`, `better-sqlite3`, and `DATABASE_URL` from the env contract.
5. Re-deploy and verify Google sign-in, workout CRUD, calendar, and progress
   end-to-end on Vercel.
