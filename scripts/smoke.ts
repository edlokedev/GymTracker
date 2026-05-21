type SmokeTarget = {
  name: string
  path: string
  expectJson?: boolean
  assert?: (body: unknown) => void
}

const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const userId =
  process.env.SMOKE_USER_ID || 'NMUKDBTSGLRu9otdn6qK5fOVoNNQVdT6'
const workoutId = process.env.SMOKE_WORKOUT_ID || '7242k8sav42farsnrt0o1v'
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

const targets: SmokeTarget[] = [
  { name: 'home route', path: '/' },
  { name: 'workout route', path: '/workout' },
  { name: 'exercises route', path: '/exercises' },
  { name: 'history route', path: '/history' },
  { name: 'progress route', path: '/progress' },
  {
    name: 'auth session',
    path: '/api/auth/get-session',
    expectJson: true,
  },
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
    name: 'exercise search',
    path: '/api/exercises/search?limit=5',
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      assertArray(body.data, 'data')
      if (typeof body.total !== 'number' || !Number.isFinite(body.total)) {
        throw new Error('Expected total number')
      }
      if (body.hasMore !== true) {
        throw new Error('Expected first exercise page to have more results')
      }
      const placeholder = body.data.find((item) => {
        assertRecord(item)
        return typeof item.name === 'string' && /^Exercise \d+/.test(item.name)
      })
      if (placeholder) {
        throw new Error('Exercise placeholder row leaked into search results')
      }
    },
  },
  {
    name: 'calendar data',
    path: `/api/calendar-data?userId=${userId}&start=2026-04-20T00%3A00%3A00.000Z&end=2026-05-20T00%3A00%3A00.000Z`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertArray(body.data, 'data')
    },
  },
  {
    name: 'progress data',
    path: `/api/progress?userId=${userId}`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertRecord(body.data)
      assertArray(body.data.progress, 'data.progress')
    },
  },
  {
    name: 'workout sessions',
    path: `/api/workout-sessions?userId=${userId}&limit=5`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertRecord(body.data)
      assertArray(body.data.data, 'data.data')
    },
  },
  {
    name: 'workout details',
    path: `/api/workout-details?userId=${userId}&date=2026-05-17`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertArray(body.data, 'data')
    },
  },
  {
    name: 'workout sets',
    path: `/api/workout-sets?workoutId=${workoutId}`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertArray(body.data, 'data')
    },
  },
  {
    name: 'exercise history',
    path: `/api/workout-sets?action=history&userId=${userId}&exerciseId=${exerciseId}&limit=5`,
    expectJson: true,
    assert: (body) => {
      assertRecord(body)
      if (body.success !== true) {
        throw new Error('Expected success true')
      }
      assertArray(body.data, 'data')
    },
  },
]

async function runTarget(target: SmokeTarget) {
  const response = await fetch(`${baseUrl}${target.path}`, {
    headers: { accept: target.expectJson ? 'application/json' : 'text/html,application/xhtml+xml' },
  })
  const text = await response.text()

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`)
  }

  const marker = badBodyMarkers.find((badMarker) => text.includes(badMarker))
  if (marker) {
    throw new Error(`Found runtime/error marker: ${marker}`)
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
