# Plan Review Log: Enable adding to favourites on `/exercises`

Act 1 (grill-with-docs) complete — plan locked at `docs/plans/favourites-toggle-on-exercises.md`. No new CONTEXT.md term, no ADR (reversible UI wiring). MAX_ROUNDS=5.

## Round 1 — Codex (after inlining plan+source; first attempt failed on network-mount read block)

Verdict: REVISE. Findings (summarised): (1) ExerciseBrowser reused as in-workout picker — wiring stars there too may change picker UX; (2) rapid double-tap race off stale `wasFavorite`; (3) single global `togglingFavoriteId` overwritten by concurrent toggles; (4) out-of-order `fetchFavoriteExercises` refetch; (5) no pending/disabled state on the star; (6) modal star `stopPropagation` unverified; (7) stale-session 401 only silently rolls back; (8) favourites-not-loaded first-render flicker; (9) ≥44px touch target unverified; (10) keyboard activation untested; (11) `Set` prop identity / re-render; (12) inline `onToggleFavorite` new fn each render; (13) catch path restores only id set, not `favoriteExercises`/reflect; (14) reflect-after-success vs current filters/pagination; (15) thin tests; (16) signed-out test doesn't assert no private API call; (17) favourite/favorite naming; (18) simpler `getIsFavorite` predicate vs Set.

### Claude's response
ACTED: (1) gate star wiring to standalone browser mode (not picker); (2)+(5)+(10) add per-exercise pending `disabled` on `FavoriteStarButton` via existing `togglingFavoriteId`, covers double-tap + keyboard; (6) test modal star propagation; (9) enforce/verify h-11 w-11; (12) `useCallback` the handler; (15)+(16) expanded tests incl. signed-out asserts no private call, pending disable, favourites-filter removal; (17) keep `favorite*` identifiers / "Favourite" copy — documented.
DEFERRED (pre-existing hook behavior from the favourites PR, not worsened here; logged in plan "Deferred" section): (3) global togglingFavoriteId→Set, (4) out-of-order refetch guard, (7) explicit 401 UX, (13)+(14) catch-path reflect / pagination semantics. Per-exercise pending disable removes the main user-reachable trigger; full concurrency hardening is a separate task.
REJECTED (logged in plan "Rejected" section): (18) predicate vs Set, (11) memo cards, (8) gate-until-loaded (accept minor flicker).

## Round 2 — Codex

Verdict: REVISE. Prior items mostly addressed (picker gate, touch target, keyboard, naming — confirmed; require tests). New must-fix raised: (A) per-exercise pending insufficient — concurrent different-exercise toggles still reachable given single global togglingFavoriteId → disable ALL stars while any pending, or harden hook now; (B) "signed-out → no fetch" conflicts with "hook unchanged" unless hook auth-gates favourite fetching → verify; (C) failed unfavourite under active filter may leave card removed vs id-set rollback mismatch → refetch/reflect on catch or block toggling under active filter; (D) stale-session 401 more likely on public route → at minimum generic failure toast + auth refresh; (E) disabled star must keep aria-pressed/aria-label/aria-busy coherent. New: (F) static-Tailwind rule easy to violate with pending/disabled classes → complete static strings only. Acceptable deferrals confirmed: Set vs predicate, card memo, first-render flicker, full sequencing guard (IF all stars globally disabled during pending), rich sign-in UX (if minimal error/auth refresh exists).

### Claude's response
ACTED: (A) adopt GLOBAL disable-while-any-pending (togglingFavoriteId != null) — closes the race, and Codex accepts deferring sequencing under exactly this condition; (E) aria-pressed/aria-busy/aria-label + disabled coherence, with tests; (F) complete static class strings per state.
VERIFIED + CORRECTED (B): confirmed the hook's mount load GETs /api/exercise-favorites unconditionally (caught), so anon DOES hit it on mount — corrected the test claim to "no MUTATION (POST/DELETE)" and logged the anon mount-GET as a pre-existing out-of-scope follow-up.
REJECTED (C) as a must-fix, with proof: optimistic toggle touches only the id set, never the displayed list (reflect runs on success only), so a failed toggle under an active filter leaves the grid intact and only reverts the star — added test (f) to lock this behavior. No catch-path change needed.
DEFERRED (D) with firm reason: NO toast/notification system exists in the repo (verified by grep) → adding one is out of scope for a missing-affordance fix; safe rollback already prevents broken state and the star is gated on a present `user` (401 rare). Logged.

## Round 3 — Codex

**VERDICT: APPROVED.** "Prior blockers resolved. Must-fix-before-coding: none." Accepted all deferrals (anon mount-GET, hook hardening under global-disable, 401 UX, first-render flicker). Implementation guardrails to honour: global disable from a single `togglingFavoriteId != null` boolean across grid + modal; tests must prove a different-card second tap is blocked while a toggle is pending; static Tailwind strings only for disabled/busy; anon test scoped to no POST/DELETE (not no GET).

**Converged in 3 rounds** (R1 sandbox-read failure recovered by inlining source). Act 2 complete.
