type SmokeTarget = {
  name: string
  path: string
  expectJson?: boolean
  // Expected HTTP status. Defaults to 200. Private routes are expected to
  // reject unauthenticated requests with 401 (the Supabase auth gate).
  expectStatus?: number
  assert?: (body: unknown) => void
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')

// userId is intentionally bogus. Private routes derive identity from the
// Supabase session cookie and never trust query userId, so these requests
// must come back 401 regardless of what we send.
const userId = process.env.SMOKE_USER_ID || 'smoke-unauthenticated'
const workoutId = process.env.SMOKE_WORKOUT_ID || 'smoke-workout'
const exerciseId = process.env.SMOKE_EXERCISE_ID || '0739'

const badBodyMarkers = [
  'Something went wrong',
  'Cannot access',
  'HTTPError',
  'ReferenceError',
  'TypeError',
  'Unhandled',
  'Failed to fetch calendar data',
  'Failed to fetch progress data',
]

function assertRecord(body: unknown): asserts body is Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Expected JSON object')
  }
}

function assertArray(value: unknown, name: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${name} to be array`)
  }
}

// Private route: must reject an unauthenticated request with the 401 envelope.
function assertUnauthorized(body: unknown) {
  assertRecord(body)
  if (body.success !== false) {
    throw new Error('Expected success false on auth-gated route')
  }
  if (body.error !== 'Unauthorized') {
    throw new Error(`Expected Unauthorized error, got ${JSON.stringify(body.error)}`)
  }
}

const targets: SmokeTarget[] = [
  { name: 'home route', path: '/' },
  { name: 'workout route', path: '/workout' },
  { name: 'exercises route', path: '/exercises' },
  { name: 'history route', path: '/history' },
  { name: 'progress route', path: '/progress' },
  {
    name: 'exercise categories',
    path: '/api/exercise-categories',
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      assertArray(body.data, 'data')
    },
  },
  {
    name: 'equipment types',
    path: '/api/equipment-types',
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      assertArray(body.data, 'data')
    },
  },
  {
    name: 'muscle groups',
    path: '/api/muscle-groups',
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      assertArray(body.data, 'data')
    },
  },
  {
    // Public catalog. Envelope wraps the handler result as `data`, and the
    // handler returns `{ items, total, page, totalPages, hasMore }`.
    name: 'exercise search',
    path: '/api/exercises/search?limit=5',
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      assertRecord(body.data)
      const page = body.data
      assertArray(page.items, 'data.items')
      if (typeof page.total !== 'number' || !Number.isFinite(page.total)) {
        throw new Error('Expected data.total number')
      }
      if (page.hasMore !== true) {
        throw new Error('Expected first exercise page to have more results')
      }
      const items = page.items as unknown[]
      const placeholder = items.find((item) => {
        assertRecord(item)
        return typeof item.name === 'string' && /^Exercise \d+/.test(item.name)
      })
      if (placeholder) {
        throw new Error('Exercise placeholder row leaked into search results')
      }
    },
  },
  // Private routes — unauthenticated requests must hit the Supabase auth gate
  // and return 401. This verifies the boundary, not the authed payload shape
  // (authed-path coverage lives in the contract tests).
  {
    name: 'calendar data (auth gate)',
    path: `/api/calendar-data?userId=${userId}&start=2026-04-20T00%3A00%3A00.000Z&end=2026-05-20T00%3A00%3A00.000Z`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
  {
    name: 'progress data (auth gate)',
    path: `/api/progress?userId=${userId}`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
  {
    name: 'workout sessions (auth gate)',
    path: `/api/workout-sessions?userId=${userId}&limit=5`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
  {
    name: 'workout details (auth gate)',
    path: `/api/workout-details?userId=${userId}&date=2026-05-17`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
  {
    name: 'workout sets (auth gate)',
    path: `/api/workout-sets?workoutId=${workoutId}`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
  {
    name: 'exercise history (auth gate)',
    path: `/api/workout-sets?action=history&userId=${userId}&exerciseId=${exerciseId}&limit=5`,
    expectJson: true,
    expectStatus: 401,
    assert: assertUnauthorized,
  },
]

async function runTarget(target: SmokeTarget) {
  const response = await fetch(`${baseUrl}${target.path}`, {
    headers: { accept: target.expectJson ? 'application/json' : 'text/html,application/xhtml+xml' },
  })
  const text = await response.text()
  const expectStatus = target.expectStatus ?? 200

  if (response.status !== expectStatus) {
    throw new Error(`Expected HTTP ${expectStatus}, got ${response.status}: ${text.slice(0, 200)}`)
  }

  // Only scan for runtime-error markers on success responses. A deliberate
  // 401 envelope is expected and must not trip the marker scan.
  if (expectStatus === 200) {
    const marker = badBodyMarkers.find((badMarker) => text.includes(badMarker))
    if (marker) {
      throw new Error(`Found runtime/error marker: ${marker}`)
    }
  }

  if (!target.expectJson) {
    return
  }

  let body: unknown
  try {
    body = text ? JSON.parse(text) : null
  } catch (error) {
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  target.assert?.(body)
}

let failures = 0

console.log(`Smoke base: ${baseUrl}`)

for (const target of targets) {
  try {
    await runTarget(target)
    console.log(`PASS ${target.name}`)
  } catch (error) {
    failures += 1
    const message = error instanceof Error ? error.message : String(error)
    console.error(`FAIL ${target.name}: ${message}`)
  }
}

if (failures > 0) {
  console.error(`Smoke failed: ${failures} target(s)`)
  process.exit(1)
}

console.log(`Smoke passed: ${targets.length} target(s)`)

export {}
