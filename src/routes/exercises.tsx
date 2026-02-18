import { createFileRoute } from '@tanstack/react-router'
import ExerciseBrowser from '../components/ExerciseBrowser'

export const Route = createFileRoute('/exercises')({
  component: ExercisesPage
})

function ExercisesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <ExerciseBrowser />
    </div>
  )
}