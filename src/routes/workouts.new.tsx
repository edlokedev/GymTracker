import { createFileRoute } from '@tanstack/react-router'
import { WorkoutTemplateEditor } from '@/features/workout-templates/components/WorkoutTemplateEditor'

export const Route = createFileRoute('/workouts/new')({
  component: WorkoutTemplateEditor,
})
