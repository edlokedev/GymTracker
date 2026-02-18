import { Link } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'

export default function Header() {
  const { isAuthenticated, user, signOut } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-blue-600 hover:text-blue-700">
              GymTracker
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="flex items-center space-x-8">
            {isAuthenticated ? (
              <>
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                
                <Link 
                  to="/workout" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Log Workout
                </Link>
                
                <Link 
                  to="/exercises" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Exercise Library
                </Link>
                
                <Link 
                  to="/progress" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Progress
                </Link>

                {/* User Menu */}
                <div className="flex items-center space-x-4 border-l border-gray-200 pl-6">
                  <div className="flex items-center space-x-2">
                    {user?.image && (
                      <img 
                        src={user.image} 
                        alt={user.name || 'User'} 
                        className="w-8 h-8 rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-700">
                      {user?.name || user?.email}
                    </span>
                  </div>
                  <button
                    onClick={signOut}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Home
                </Link>
                
                <Link 
                  to="/exercises" 
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Exercise Library
                </Link>

                {/* Demo Links - smaller and grouped */}
                <div className="flex items-center space-x-4 text-sm text-gray-500 border-l border-gray-200 pl-6">
                  <Link 
                    to="/demo/start/server-funcs" 
                    className="hover:text-gray-700 transition-colors"
                  >
                    Demo: Server
                  </Link>
                  
                  <Link 
                    to="/demo/start/api-request" 
                    className="hover:text-gray-700 transition-colors"
                  >
                    Demo: API
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
