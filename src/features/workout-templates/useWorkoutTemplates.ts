import { useCallback, useEffect, useState } from 'react'
import type { WorkoutTemplateWithExercises } from '@/lib/types/database'
import { archiveWorkoutTemplate, loadWorkoutTemplates } from './client'

export function useWorkoutTemplates({ enabled = true }: { enabled?: boolean } = {}) {
  const [templates, setTemplates] = useState<WorkoutTemplateWithExercises[]>([])
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setTemplates([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setTemplates(await loadWorkoutTemplates())
    } catch (loadError) {
      console.error('Failed to load saved workouts:', loadError)
      setError('Failed to load saved workouts')
      setTemplates([])
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const archive = useCallback(async (templateId: string) => {
    try {
      setArchivingId(templateId)
      setError(null)
      await archiveWorkoutTemplate(templateId)
      setTemplates((current) => current.filter((template) => template.id !== templateId))
      return true
    } catch (archiveError) {
      console.error('Failed to archive saved workout:', archiveError)
      setError('Failed to archive saved workout')
      return false
    } finally {
      setArchivingId(null)
    }
  }, [])

  return {
    templates,
    isLoading,
    error,
    archivingId,
    actions: {
      refresh,
      archive,
    },
  }
}
