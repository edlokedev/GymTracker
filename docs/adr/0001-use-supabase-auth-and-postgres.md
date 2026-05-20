# 0001. Use Supabase Auth and Supabase Postgres for Production Backend

## Status

Accepted

## Context

GymTracker is moving from local SQLite and Better Auth toward Vercel deployment with a Supabase backend. The current API shape passes user ids from client requests into server routes, then queries local SQLite. That shape is convenient locally but weak for production authorization because user ownership is enforced mainly in application code.

Supabase Postgres can enforce user ownership with Row Level Security when requests carry a Supabase Auth identity. This makes the database a durable authorization boundary instead of relying only on TanStack server route checks.

## Decision

Use Supabase Auth as the canonical authentication system and Supabase Postgres as the production database.

Keep TanStack server routes where they add value for validation, workout writes, aggregates, calendar data, progress data, and service-role operations. Remove client-provided `userId` trust from private APIs. Server routes must derive the authenticated user from the Supabase session or token.

Public exercise catalog reads may use direct Supabase access later if Row Level Security policies keep the catalog read-only and safe.

Migrate with server-route compatibility first. Existing client-facing API response shapes should stay stable while route internals move from SQLite queries to Supabase/Postgres. Client simplification can happen after production data, auth, and authorization are stable.

Use both local Supabase CLI development and a linked remote Supabase project. Local migrations and seed data should be tested against the CLI stack first, then pushed to the remote project used by Vercel preview and production.

## Consequences

- Google OAuth moves from Better Auth configuration into Supabase Auth.
- Better Auth route handlers, client helpers, sessions, and auth tables become migration targets for removal.
- Supabase Row Level Security policies become mandatory for private workout data.
- Existing SQLite schema and query modules need Postgres-compatible replacements.
- Vercel deployment no longer depends on local filesystem persistence for production data.
- The first migration pass should avoid a broad UI rewrite by preserving existing TanStack server route contracts where practical.
- The repository needs Supabase migration, seed, and type generation workflow documentation before code migration starts.
