import { createFileRoute } from '@tanstack/react-router'
import { WorkoutTemplateEditor } from '@/features/workout-templates/components/WorkoutTemplateEditor'

export const Route = createFileRoute('/workouts/$templateId/edit')({
  component: EditWorkoutRoute,
})

function EditWorkoutRoute() {
  const { templateId } = Route.useParams()

  return <WorkoutTemplateEditor templateId={templateId} />
}
