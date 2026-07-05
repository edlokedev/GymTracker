# 0006. useAuth Returns a Referentially Stable User

## Status

Accepted — implemented in commit `c748069` (`fix(auth): memoize useAuth user to stop edge-request runaway`), merged to `main`.

## Context

Gymmie's Vercel Hobby deployment was burning edge requests at a runaway rate: ~780,101 of the 1,000,000 monthly cap (~78%), with function invocations roughly 1:1 against edge requests — the signature of a client-side refetch loop rather than static or prefetch traffic. Peak draw was ~280k/day, with onset around Jun 22, matching the custom-exercise feature commits (Jun 21).

Root cause was in `src/lib/auth/index.ts`. `useAuth()` returned `{ user: adaptUser(supa.user) }`, and `adaptUser()` builds a **fresh object on every call**. So `user` was a new reference on every render. Any consumer with `user` in a hook dependency array therefore re-fired every render. Specifically, `ExerciseBrowser` had `useCallback(..., [user])` feeding a `useEffect(..., [refreshOwnedCustomIds])`, which re-ran each render and looped fetches to `/api/exercises/custom` as fast as they resolved. The loop only fired for an authenticated user with `/exercises` mounted; signed out, `adaptUser` returns a stable `null`, so it stayed quiet.

## Decision

Make the adapted user **referentially stable** at the source, so every consumer is fixed at once:

```ts
const user = useMemo(() => adaptUser(supa.user), [supa.user])
```

`user` now only changes identity when the underlying Supabase user changes, not on every render.

As defense-in-depth, `ExerciseBrowser` was changed to depend on the **primitive** `userId = user?.id` rather than the `user` object in its refetch callback, so the consumer is robust even if an upstream object ever becomes unstable again.

`src/routes/workout.tsx` was deliberately left untouched: its `[..., user, ...]` effect is guarded and is now stable via the memo; changing it would have been an unrelated edit.

## Consequences

- The fix is at the shared hook, so all `useAuth()` consumers get a stable `user` reference — no per-consumer patching needed.
- Edge-request / function-invocation draw drops back to expected levels once deployed; already-open tabs keep running the old looping bundle until refreshed.
- Establishes a reusable rule for the codebase: **shared auth/context hooks must not return freshly-built objects each render** — memoize adapters, and in consumers prefer primitives (e.g. `user?.id`) in dependency arrays over object references. (Captured as Odin memory candidate `gymmie-useauth-stable-user`.)
- A regression test (`src/lib/auth/index.test.ts`) locks the behaviour: stable reference across renders, new reference on changed user, stable `null` when signed out.

## Notes

- Verification at fix time ran in an isolated Linux replica (the project's `node_modules` is Windows-built and the Cowork mount blocks vite/vitest cache writes, so the real toolchain couldn't run in-sandbox): regression test red→green, `tsc --noEmit` clean, `biome lint` clean (incl. `useExhaustiveDependencies`). Re-validated on Oak before merge.
- Files: `src/lib/auth/index.ts` (the memo), `src/features/exercise-library/components/ExerciseBrowser.tsx` (primitive dep), `src/lib/auth/index.test.ts` (regression test).
- This ADR was reconstructed 2026-06-28 from `memory/sessions/2026-06-27-useauth-edge-request-loop-fix.md` after the original 06-27 handoff/ADR-seed write was lost to a network-drive sync drop (see Odin memory candidates `cowork-mount-stale-after-edit`, `verify-network-drive-writes-landed`).
