import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '../lib/auth'
import type { WorkoutSession } from '../lib/types/database'

interface WorkoutDashboardProps {
  className?: string
}

export default function WorkoutDashboard({ className = '' }: WorkoutDashboardProps) {
  const { user } = useAuth()
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastWorkoutDate, setLastWorkoutDate] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      loadWorkoutData()
    }
  }, [user])

  const loadWorkoutData = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      
      // Fetch recent workout sessions
      const response = await fetch(`/api/workout-sessions?userId=${user.id}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.data) {
          const sessions = data.data.data
          setRecentSessions(sessions)
          
          // Find last workout date
          if (sessions.length > 0) {
            setLastWorkoutDate(new Date(sessions[0].date))
          }
        }
      }
    } catch (error) {
      console.error('Error loading workout data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getTimeSinceLastWorkout = () => {
    if (!lastWorkoutDate) return null
    
    const now = new Date()
    const diff = now.getTime() - lastWorkoutDate.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return '1 day ago'
    return `${days} days ago`
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name || user?.email || 'Athlete'}! 💪
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {lastWorkoutDate ? (
              <>Last workout: {getTimeSinceLastWorkout()}</>
            ) : (
              'Ready to start your fitness journey?'
            )}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Link 
            to="/workout"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Start Workout</h3>
                <p className="text-blue-100">Log your sets and exercises</p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </Link>

          <Link 
            to="/exercises"
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Browse Exercises</h3>
                <p className="text-green-100">Discover new movements</p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </Link>

          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Total Sessions</h3>
                <p className="text-2xl font-bold">{recentSessions.length}</p>
              </div>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Workouts
            </h2>
            {recentSessions.length > 0 && (
              <Link 
                to="/workout"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                View All
              </Link>
            )}
          </div>

          {recentSessions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No workouts yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start your fitness journey by logging your first workout session.
              </p>
              <Link 
                to="/workout"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start First Workout
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {session.name || `Workout ${formatDate(session.date)}`}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(session.date)}
                      {session.end_time && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          ✓ Completed
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.start_time && new Date(session.start_time).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}