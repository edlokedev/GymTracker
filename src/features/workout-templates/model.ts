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
  const [lastSession] = recentSessions

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

  if (lastSession) {
    const name = lastSession.name?.trim() || 'last workout'
    return {
      type: 'repeat-last',
      title: `Repeat ${name}`,
      reason: 'Based on your latest workout.',
      ctaLabel: 'Start Workout',
      sessionId: lastSession.id,
    }
  }

  return {
    type: 'starter',
    title: 'Start your first workout',
    reason: 'No workouts logged yet.',
    ctaLabel: 'Start Workout',
  }
}
