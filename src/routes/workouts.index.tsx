import { createFileRoute } from '@tanstack/react-router'
import { WorkoutsPage } from '@/features/workout-templates/components/WorkoutsPage'

export const Route = createFileRoute('/workouts/')({
  component: WorkoutsPage,
})
