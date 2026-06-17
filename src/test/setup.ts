import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { invalidateApiCache } from '@/lib/api'

// Reset the module-level client API cache between tests so a populated cache
// (e.g. catalog facets) can't bleed into a later test's mocked fetch.
afterEach(() => {
  invalidateApiCache()
})
