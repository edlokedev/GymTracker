# Route Deepening Spec

**Status**: Draft, pre-grilling.
**Scope**: Phase A = `definePrivateRoute`; Phase B = typed route contracts + test harness.
**Sequencing**: A → B. B depends on A's uniform envelope.

---

## 0. Goal

Eliminate route-layer boilerplate and silent client↔server drift. Specifically:

1. Every private API route currently re-implements: auth gate, refresh-cookie merging, JSON envelope, error mapping. ~35 % of each `api.*.ts` file. Drift already happened (`unauthorizedResponse` defined twice).
2. Three production bugs this week were all the same shape: client called a URL the server didn't implement (or implemented differently). Unit tests mock at both sides — neither saw the seam.

Acceptance for both phases:

- 88/88 existing tests still pass (no regression).
- `SERVER_PRESET=vercel bun run build` continues to emit `.vercel/output`.
- Every API route's on-the-wire response bytes are byte-identical to today (verified via diff against captured fixtures).
- New contract tests catch all 3 of this week's prod bugs when re-introduced on a branch.

---

## 1. Out of scope

- The query module consolidation (Candidates 3, 5 in the architecture review).
- Exercise-catalog split (Candidate 4).
- Auth adapter deepening (Candidate 6).
- Postgres RPC migration for any aggregate.
- E2E tests against a real Supabase instance. Contract tests use a stubbed Supabase client.

---

## 2. Phase A — `definePrivateRoute`

### 2.1 Files

**New**:
- `src/lib/api/define-private-route.ts` — the deepened module.
- `src/lib/api/define-public-route.ts` — sibling for catalog routes (no auth gate, same envelope).
- `src/lib/api/envelope.ts` — `ApiEnvelope<T>` discriminated union + serializer.

**Modified** (route bodies shrink ~60-70 %):
- `src/routes/api.workout-sessions.ts`
- `src/routes/api.workout-sets.ts`
- `src/routes/api.workout-details.ts`
- `src/routes/api.progress.ts`
- `src/routes/api.calendar-data.ts`
- `src/routes/api.exercise-categories.ts`
- `src/routes/api.equipment-types.ts`
- `src/routes/api.muscle-groups.ts`
- `src/routes/api.exercises.search.ts`
- `src/routes/auth.callback.tsx` — leave alone (302 redirect, not JSON).

**Removed (post-migration)**:
- `src/lib/supabase/response.ts` — `mergeHeaders` folded into the new module.

### 2.2 Behavior of `definePrivateRoute`

Inputs per method handler:
- `user`: Supabase `User` (already authenticated; never null in handler body).
- `supabase`: request-scoped `SupabaseClient` (cookies bridged).
- `request`: original `Request`.
- `url`: pre-parsed `URL` (skip the `new URL(request.url)` dance in every handler).
- `params`: route params from TanStack.

Return value: plain JSON-able data (`T`). Helpers thrown as typed errors:
- `notFound(message?)` → 404.
- `badRequest(message?)` → 400.
- Anything else → 500 with `console.error`.

Module owns:
- Auth gate: missing/expired session → 401 `{ error: 'Unauthorized' }`. Handler never runs.
- Cookie merge: `responseHeaders` from `getSupabaseServerClient` appended to outgoing `set-cookie`.
- Envelope: success → `{ success: true, data: T }`. Error → `{ success: false, error: string }`.
- RLS error mapping: Postgres `42501` (insufficient_privilege) or `PGRST116` (no rows) returned from a query → `404` (lookup) or `403` (mutation), translated via a `RlsError` thrown by the query layer.
- Per-method dispatch: `methods({ GET, POST, PATCH, DELETE })` like the current TanStack `createServerFileRoute` shape.

### 2.3 Public sibling

`definePublicRoute` is the same minus the auth gate. Used by catalog endpoints. Same envelope, same error helpers. Identical look-and-feel reduces per-route cognitive overhead.

### 2.4 Migration sequence

1. Land `define-private-route.ts` and `define-public-route.ts` with full tests for the module itself (auth fail, success envelope, error envelopes, cookie merge).
2. Migrate routes one at a time, in this order (lowest blast radius first):
   1. `api.equipment-types.ts` (public, simplest)
   2. `api.muscle-groups.ts`
   3. `api.exercise-categories.ts`
   4. `api.exercises.search.ts`
   5. `api.workout-details.ts`
   6. `api.calendar-data.ts`
   7. `api.progress.ts`
   8. `api.workout-sets.ts`
   9. `api.workout-sessions.ts`
3. After each route migrates: run `bun run test` + curl that endpoint against local dev + diff response bytes against a saved baseline.
4. Delete `src/lib/supabase/response.ts` once nothing imports `mergeHeaders` anymore.

### 2.5 Acceptance

- Each route file's logic ≤ ~80 LOC (today: 124-311 LOC).
- Zero direct uses of `mergeHeaders` outside `define-*-route.ts` and `auth.callback.tsx`.
- `unauthorizedResponse` helper deleted (defined in 2 routes today).
- Response-byte diff between pre- and post-migration responses = 0 for all 9 routes.

### 2.6 Rollback

Each route migration is one commit. Revert is trivial. The new module file is additive; leaving it unused doesn't break anything.

---

## 3. Phase B — Route contracts + contract tests

### 3.1 Files

**New**:
- `src/lib/api/contracts/index.ts` — barrel.
- `src/lib/api/contracts/workout-sessions.contract.ts`
- `src/lib/api/contracts/workout-sets.contract.ts`
- `src/lib/api/contracts/workout-details.contract.ts`
- `src/lib/api/contracts/progress.contract.ts`
- `src/lib/api/contracts/calendar-data.contract.ts`
- `src/lib/api/contracts/exercise-categories.contract.ts`
- `src/lib/api/contracts/equipment-types.contract.ts`
- `src/lib/api/contracts/muscle-groups.contract.ts`
- `src/lib/api/contracts/exercises.search.contract.ts`
- `tests/contract/run-route.ts` — harness that invokes a route handler with a stubbed Supabase client.
- `tests/contract/*.test.ts` — one per contract.

**Modified**:
- Every `src/features/*/client.ts` — import response type from the contract instead of declaring locally.
- Every `src/routes/api.*.ts` — register against the contract (path + method types).

### 3.2 What a contract module looks like

Shape (pre-grilling, not final):

```ts
export const WorkoutSessionsContract = defineContract({
  path: '/api/workout-sessions',
  methods: {
    GET: {
      query: { id: z.string().optional(), includeDetails: z.literal('true').optional(), limit: z.coerce.number().optional(), offset: z.coerce.number().optional() },
      response: z.discriminatedUnion('shape', [
        z.object({ shape: z.literal('one'), data: WorkoutSessionSchema }),
        z.object({ shape: z.literal('detail'), data: WorkoutWithDetailsSchema }),
        z.object({ shape: z.literal('list'), data: PaginatedSchema(WorkoutSessionSchema) }),
      ]),
    },
    POST: { body: WorkoutSessionInputSchema, response: WorkoutSessionSchema },
    PATCH: { query: { id: z.string(), action: z.literal('complete').optional() }, body: WorkoutSessionPatchSchema, response: WorkoutSessionSchema },
    DELETE: { query: { id: z.string() }, response: z.object({}) },
  },
})
```

Why zod (or similar): contract module is the only place a schema is declared. Server parses request with it; client types responses with `z.infer`; tests assert responses against it. Single source of truth.

If zod feels heavy, alternative: pure TS types + a manual response-shape assertion helper. Decision deferred to grilling.

### 3.3 Contract test harness

`tests/contract/run-route.ts` exports:

```ts
runRoute({
  contract,           // contract module
  method,             // 'GET' | 'POST' | …
  query?, body?,      // request inputs
  user,               // stubbed authed user (or null for anon)
  supabase,           // pre-canned stub (in-memory rows + RLS sim)
}) => Promise<{ status, headers, body }>
```

Test pattern:

```ts
it('GET ?id=X&includeDetails=true returns WorkoutWithDetails', async () => {
  const supabase = stubSupabase({ workout_sessions: [...], workout_sets: [...], exercises: [...] })
  const res = await runRoute({ contract, method: 'GET', query: { id: 'abc', includeDetails: 'true' }, user, supabase })
  expect(res.status).toBe(200)
  WorkoutSessionsContract.methods.GET.response.parse(res.body)  // contract assertion
  expect(res.body.data.exercises[0].exercise.gif_path).toBeTruthy()
})
```

Fixtures live alongside the test. The stub Supabase implements `.from().select().eq().…` with an in-memory table + a tiny RLS gate keyed on the stubbed user id.

### 3.4 Migration sequence

1. Land the contract module + harness with one route's contract + test as the first proof of concept. Pick `equipment-types` (simplest, public).
2. Migrate one route per PR (or one batch of 3 if low-risk). Order matches Phase A.
3. For each: write contract → swap server handler to consume request types from contract → swap client.ts to consume response types from contract → write tests for happy path + 401/404/400.
4. Replace ad-hoc `readApiData<FooResponse>()` generics in each feature's `client.ts` with the contract-typed version.

### 3.5 Acceptance

- One contract module per route (9 total).
- One contract test file per route (9 total). Each tests at minimum: happy path 2xx, 401 (where applicable), 4xx for malformed input, 404 for missing id (where applicable).
- Re-introducing each of this week's 3 prod bugs on a feature branch causes a contract test to fail before merge.
- `bun run test` count goes from 88 → ≥ 88 + 30 (3 cases × ~10 routes that need them).
- Test suite still finishes < 60 s locally.

### 3.6 Rollback

Contracts are additive. If we drop the harness mid-migration, everything still works — the contracts become typed shapes referenced by client/server, no harm done.

---

## 4. Test plan

| Layer | Today | After A | After B |
|---|---|---|---|
| `define-*-route` module | n/a | unit tests (auth gate, envelope, error mapping, cookie merge) | unchanged |
| Each route | mocked-query unit test or none | unchanged | + contract test (happy + edge) |
| Each feature `client.ts` | thin existence tests | unchanged | typed against contract; tests trivially pass |
| Supabase query modules | unit tests with mocked client | unchanged | unchanged |
| End-to-end | none | none | none — explicitly out of scope |

Coverage target: contract test must exercise every distinct `method × response-shape` per route. For `GET /api/workout-sessions` that's 3 shapes (`one`, `detail`, `list`). Bug-classes prevented: undefined fields, missing handler branches, pagination cap silently truncating results.

---

## 5. Risk + sequence summary

| Phase | Effort | Risk | Unblocks |
|---|---|---|---|
| A | 1-2 h focused | Low — pure refactor, response bytes unchanged | B |
| B | 3-4 h | Medium — new test infra, schema-validator choice | Fixes the bug class this week |

Order is strict: **A first**. The contract response schemas in B are mostly the inner `data` shape — only meaningful if the outer envelope is uniform, which A guarantees.

---

## 6. Open questions for grilling

1. **Schema validator choice**: zod, valibot, ArkType, or hand-written TS types + runtime asserter? Affects bundle size and migration friction.
2. **Where contracts live**: `src/lib/api/contracts/` (centralized) or alongside the route file (co-located)? Co-located = better grep-walk for AI agents; centralized = easier to enumerate.
3. **RLS error shape from queries**: do query modules throw a typed `RlsError`, or do they translate inline? Cleanest if the route module owns translation, but means every query module needs to surface raw Postgres errors uniformly.
4. **`auth.callback.tsx` envelope**: that route returns 302 redirects, not JSON. Keep it outside the deepened module entirely, or add a `defineRedirectRoute` sibling for symmetry?
5. **Contract test isolation**: in-memory Supabase stub vs real `pglite` instance? Stub is faster but can't catch SQL-level bugs (PostgREST quirks, jsonb operator behavior). pglite + a snapshot of the schema would be a 10× test-time hit but a 10× confidence gain.

These are the branch points for the grilling session.
