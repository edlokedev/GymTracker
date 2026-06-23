import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'

const AUTH_NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/workouts', label: 'Workouts' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
] as const

const PUBLIC_NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/exercises', label: 'Exercise Library' },
] as const

export default function Header() {
  const { isAuthenticated, user, signOut } = useAuth()
  const navItems = isAuthenticated ? AUTH_NAV_ITEMS : PUBLIC_NAV_ITEMS

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:text-blue-700"
              >
                <img src="/gymmie-icon.png" alt="" className="h-8 w-8 rounded-lg" />
                Gymmie
              </Link>
            </div>

            <nav className="hidden items-center space-x-8 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="motion-press text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  {item.label}
                </Link>
              ))}

              {isAuthenticated ? (
                <div className="flex items-center space-x-4 border-l border-gray-200 pl-6">
                  <div className="flex items-center space-x-2">
                    {user?.image && (
                      <img
                        src={user.image}
                        alt={user.name || 'User'}
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-700">{user?.name || user?.email}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="motion-press text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : null}
            </nav>

            {isAuthenticated ? (
              <button
                onClick={signOut}
                className="motion-press rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 md:hidden"
              >
                Sign Out
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {isAuthenticated ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-gray-200 border-t bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
          aria-label="Primary mobile navigation"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {AUTH_NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="motion-press flex min-h-12 items-center justify-center rounded-lg px-2 text-center text-xs font-semibold text-gray-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </>
  )
}
