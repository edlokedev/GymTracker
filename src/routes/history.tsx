import { createFileRoute } from '@tanstack/react-router'
import { WorkoutHistoryPage } from '@/features/workout-history'

export const Route = createFileRoute('/history')({
  component: WorkoutHistoryPage,
})
