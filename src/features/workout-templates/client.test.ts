import { describe, expect, it, vi } from 'vitest'
import {
  archiveWorkoutTemplate,
  createWorkoutTemplate,
  loadWorkoutTemplate,
  loadWorkoutTemplates,
  startWorkoutFromTemplate,
  updateWorkoutTemplate,
} from './client'

describe('workout templates client', () => {
  it('uses Workouts CRUD endpoints with expected methods and bodies', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init })
        return Response.json({ success: true, data: init?.method === 'DELETE' ? undefined : [] })
      }),
    )

    const input = {
      name: 'Push Day',
      notes: 'Heavy',
      exercises: [{ exerciseId: 'bench-press', targetSets: 3, notes: 'Top sets' }],
    }

    await loadWorkoutTemplates()
    await loadWorkoutTemplate('tpl-1')
    await createWorkoutTemplate(input)
    await updateWorkoutTemplate('tpl-1', input)
    await archiveWorkoutTemplate('tpl-1')

    expect(requests[0]).toEqual({ url: '/api/workout-templates', init: undefined })
    expect(requests[1]).toEqual({ url: '/api/workout-templates?id=tpl-1', init: undefined })
    expect(requests[2]).toEqual({
      url: '/api/workout-templates',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    })
    expect(requests[3]).toEqual({
      url: '/api/workout-templates?id=tpl-1',
      init: {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    })
    expect(requests[4].url).toBe('/api/workout-templates?id=tpl-1')
    expect(requests[4].init?.method).toBe('DELETE')
  })

  it('starts a saved workout through the workout-session action route', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({ url: String(input), init })
        return Response.json({
          success: true,
          data: {
            session: { id: 'session-1' },
            template: { id: 'tpl-1' },
          },
        })
      }),
    )

    await expect(startWorkoutFromTemplate('tpl-1')).resolves.toEqual({
      session: { id: 'session-1' },
      template: { id: 'tpl-1' },
    })

    expect(requests[0]).toEqual({
      url: '/api/workout-sessions?action=startFromTemplate',
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'tpl-1' }),
      },
    })
  })
})
