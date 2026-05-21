# Running Supabase locally

The local Supabase stack mirrors production closely enough to test schema
changes, RLS policies, and the auth flow without touching the linked remote
project.

## Prerequisites

- Docker Desktop (or another Docker-compatible runtime).
- The Supabase CLI: <https://supabase.com/docs/guides/cli>.

## Start the stack

From the repo root:

```bash
supabase start
```

The first run pulls container images, so expect a few minutes. Subsequent
starts are fast. The CLI prints local URLs and keys when it finishes:

- API:        <http://127.0.0.1:54321>
- DB:         `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Studio:     <http://127.0.0.1:54323>
- Inbucket (email capture for auth flows): <http://127.0.0.1:54324>

Copy the printed `publishable` and `secret` keys (older CLI builds print
them as `anon` and `service_role` — those still work) into a local `.env`
file. See `.env.example` for the variable names. Point `SUPABASE_URL` /
`VITE_SUPABASE_URL` at `http://127.0.0.1:54321`.

## Apply migrations and reset

```bash
# Apply all migrations into an empty local DB and re-run any seed SQL.
supabase db reset

# Seed the exercise catalog (uses the secret key from your .env).
npm run supabase:seed-exercises
```

`supabase db reset` is destructive against the **local** DB only — it will not
touch the remote project unless you also pass `--linked`.

## Stop the stack

```bash
supabase stop
```

Add `--no-backup` if you do not want the CLI to snapshot the local DB on stop.

## Notes

- **Storage is intentionally disabled** in `supabase/config.toml`. Exercise
  images are served from jsDelivr in the first migration slice; turn it back
  on only when private uploads become a feature.
- Inbucket captures every outbound email (including magic links and OAuth
  verification messages), so you can complete auth flows locally without
  configuring a real SMTP provider.
