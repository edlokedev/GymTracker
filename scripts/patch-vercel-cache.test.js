import { describe, expect, it } from 'vitest'
import { patchVercelCache } from './patch-vercel-cache.js'

describe('patchVercelCache', () => {
  const cacheRoute = {
    src: '/assets/(.*)',
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    continue: true,
  }

  it('adds one hit-phase route without changing existing routes or config', () => {
    const config = {
      version: 3,
      overrides: {},
      routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/__fallback' }],
    }
    const result = patchVercelCache(config)
    expect(result).toEqual({
      ...config,
      routes: [...config.routes, { handle: 'hit' }, cacheRoute],
    })
    expect(config.routes).toHaveLength(2)
    expect(patchVercelCache(result)).toEqual(result)
  })

  it('adds to an existing hit phase while retaining subsequent phases', () => {
    const routes = [
      { handle: 'filesystem' },
      { src: '/(.*)', dest: '/__fallback' },
      { handle: 'hit' },
      { src: '/other', headers: { test: 'value' }, continue: true },
      { handle: 'error' },
      { src: '/.*', status: 404 },
    ]
    const result = patchVercelCache({ version: 3, routes })
    expect(result.routes).toEqual([...routes.slice(0, 4), cacheRoute, ...routes.slice(4)])
    expect(patchVercelCache(result)).toEqual(result)
  })
})
