import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { queryKeys } from '@/lib/api/query-keys'
import { archiveWorkoutTemplate, workoutTemplatesListOptions } from './client'

export function useWorkoutTemplates({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient()

  // Saved-workouts list — a thin useQuery (ADR-0007, Phase 4). TanStack Query's
  // last-request-wins retires the old loadWorkoutTemplates race, and a rejected
  // load surfaces `error` the same way the previous state field did.
  const listQuery = useQuery({
    ...workoutTemplatesListOptions(),
    enabled,
  })

  const templates = listQuery.data ?? []
  const isLoading = listQuery.isPending && enabled
  const error = listQuery.error ? 'Failed to load saved workouts' : null

  const refresh = useCallback(async () => {
    await listQuery.refetch()
  }, [listQuery])

  // Archive removes the template server-side; invalidation re-reads the list so
  // the row disappears (matches the previous local-filter behaviour).
  const archiveMutation = useMutation({
    mutationFn: (templateId: string) => archiveWorkoutTemplate(templateId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workoutTemplates.all })
    },
  })

  const archive = useCallback(
    async (templateId: string) => {
      try {
        await archiveMutation.mutateAsync(templateId)
        return true
      } catch (archiveError) {
        console.error('Failed to archive saved workout:', archiveError)
        return false
      }
    },
    [archiveMutation],
  )

  return {
    templates,
    isLoading,
    error: archiveMutation.error ? 'Failed to archive saved workout' : error,
    archivingId: archiveMutation.isPending ? archiveMutation.variables : null,
    actions: {
      refresh,
      archive,
    },
  }
}
