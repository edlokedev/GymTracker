import { createFileRoute } from '@tanstack/react-router'
import ProgressDashboard from './progress/_components/ProgressDashboard'

export const Route = createFileRoute('/progress')({
  component: ProgressPage,
})

function ProgressPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Progress Tracking
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Monitor your fitness improvements and track personal records over time
          </p>
        </div>
        
        <ProgressDashboard />
      </div>
    </div>
  )
}