import { cleanup, render, screen } from '@testing-library/react'
import { type ComponentType, type ReactNode, useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({ isAuthenticated: false, isLoading: true }))

vi.mock('../lib/auth', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => authState,
}))
vi.mock('@tanstack/react-router', () => ({
  createRootRouteWithContext: () => (options: object) => ({ options }),
  HeadContent: () => null,
  Scripts: () => null,
}))
vi.mock('@/app/components/Header', () => ({ default: () => null }))
vi.mock('@vercel/analytics/react', () => ({ Analytics: () => null }))
vi.mock('@vercel/speed-insights/react', () => ({ SpeedInsights: () => null }))
vi.mock('@/app/devtools', () => ({ default: () => null }))

import { Route } from './__root'

const RootDocument = (
  Route.options as unknown as {
    shellComponent: ComponentType<{ children: ReactNode }>
  }
).shellComponent

afterEach(() => {
  cleanup()
  authState.isAuthenticated = false
  authState.isLoading = true
})

describe('root content', () => {
  it('preserves the child mount when auth resolves', () => {
    const mounted = vi.fn()
    function Child() {
      useEffect(() => {
        mounted()
      }, [])
      return <span>Page content</span>
    }

    const { rerender } = render(
      <RootDocument>
        <Child />
      </RootDocument>,
      { container: document },
    )
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('main')).not.toHaveAttribute('class')

    authState.isLoading = false
    authState.isAuthenticated = true
    rerender(
      <RootDocument>
        <Child />
      </RootDocument>,
    )

    expect(mounted).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('main')).toHaveClass('bg-gray-50')

    authState.isAuthenticated = false
    rerender(
      <RootDocument>
        <Child />
      </RootDocument>,
    )
    expect(mounted).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('main')).not.toHaveAttribute('class')
  })
})
