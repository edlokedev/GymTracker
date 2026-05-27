import { createFileRoute } from '@tanstack/react-router'
import ProgressDashboard from '@/features/progress/components/ProgressDashboard'

export const Route = createFileRoute('/progress')({
  component: ProgressPage,
})

function ProgressPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="font-bold text-2xl text-gray-900 dark:text-white sm:text-3xl">
            Progress Tracking
          </h1>
          <p className="mt-1 text-gray-600 text-sm dark:text-gray-300 sm:mt-2">
            Monitor your fitness improvements and track personal records over time
          </p>
        </div>

        <ProgressDashboard />
      </div>
    </div>
  )
}
