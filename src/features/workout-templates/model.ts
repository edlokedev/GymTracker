import type {
  NextWorkoutRecommendation,
  WorkoutSession,
  WorkoutTemplate,
} from '@/lib/types/database'

export function getNextWorkoutRecommendation({
  templates,
  recentSessions,
}: {
  templates: WorkoutTemplate[]
  recentSessions: WorkoutSession[]
}): NextWorkoutRecommendation {
  const activeTemplates = templates.filter((template) => !template.is_archived)
  if (activeTemplates.length > 0) {
    const usedTemplates = activeTemplates.filter((template) => template.last_used_at)
    const selected =
      usedTemplates.length > 0
        ? [...usedTemplates].sort((a, b) =>
            String(a.last_used_at).localeCompare(String(b.last_used_at)),
          )[0]
        : [...activeTemplates].sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0]

    return {
      type: 'template',
      title: `Start ${selected.name}`,
      reason: selected.last_used_at
        ? 'Least recently used saved workout.'
        : 'Newest saved workout.',
      ctaLabel: 'Start Workout',
      templateId: selected.id,
    }
  }

  return {
    type: 'starter',
    title: recentSessions.length > 0 ? 'Start a workout' : 'Start your first workout',
    reason:
      recentSessions.length > 0
        ? 'Start from Workouts or log from scratch.'
        : 'No workouts logged yet.',
    ctaLabel: 'Start Workout',
  }
}
