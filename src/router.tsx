import { createRouter as createTanstackRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

function parseSearch(search: string): Record<string, unknown> {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const parsed: Record<string, unknown> = {}

  for (const [key, rawValue] of searchParams.entries()) {
    let value: unknown = rawValue

    try {
      value = JSON.parse(rawValue)
    } catch {
      value = rawValue
    }

    const existingValue = parsed[key]
    if (existingValue === undefined) {
      parsed[key] = value
    } else if (Array.isArray(existingValue)) {
      existingValue.push(value)
    } else {
      parsed[key] = [existingValue, value]
    }
  }

  return parsed
}

function stringifySearch(search: Record<string, unknown>): string {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue

    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      if (item === undefined || item === null || item === '') continue
      searchParams.append(key, typeof item === 'object' ? JSON.stringify(item) : String(item))
    }
  }

  const searchString = searchParams.toString()
  return searchString ? `?${searchString}` : ''
}

// Create a new router instance
export const getRouter = () => {
  return createTanstackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    parseSearch,
    stringifySearch,
  })
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
