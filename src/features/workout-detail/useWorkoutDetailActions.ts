import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { deleteWorkoutDetail, duplicateWorkoutDetail } from './client'

interface UseWorkoutDetailActionsOptions {
  isOpen: boolean
  onClose: () => void
  onWorkoutDeleted?: (workoutId: string) => void | Promise<void>
  onDuplicateWorkout?: (workoutId: string) => void | Promise<void>
  onDeleteWorkout?: (workoutId: string) => void | Promise<void>
}

export function useWorkoutDetailActions({
  isOpen,
  onClose,
  onWorkoutDeleted,
  onDuplicateWorkout,
  onDeleteWorkout,
}: UseWorkoutDetailActionsOptions) {
  const navigate = useNavigate()
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) return

    setIsDeleteDialogOpen(false)
    setDeleteError(null)
    setDuplicateError(null)
  }, [isOpen])

  const duplicateWorkout = useCallback(
    async (workoutId: string) => {
      setDuplicateError(null)
      setIsDuplicating(true)

      try {
        if (onDuplicateWorkout) {
          await onDuplicateWorkout(workoutId)
          onClose()
          return
        }

        const duplicatedWorkout = await duplicateWorkoutDetail(workoutId)
        onClose()
        navigate({
          to: '/workout',
          search: { sessionId: duplicatedWorkout.id },
        })
      } catch (error) {
        console.error(error)
        setDuplicateError('Failed to duplicate workout')
      } finally {
        setIsDuplicating(false)
      }
    },
    [navigate, onClose, onDuplicateWorkout],
  )

  const requestDelete = useCallback(() => {
    setDeleteError(null)
    setIsDeleteDialogOpen(true)
  }, [])

  const cancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false)
    setDeleteError(null)
  }, [])

  const confirmDelete = useCallback(
    async (workoutId: string) => {
      setDeleteError(null)
      setIsDeleting(true)

      try {
        if (onDeleteWorkout) {
          await onDeleteWorkout(workoutId)
        } else {
          await deleteWorkoutDetail(workoutId)
        }

        await onWorkoutDeleted?.(workoutId)
        setIsDeleteDialogOpen(false)
        onClose()
      } catch (error) {
        console.error(error)
        setDeleteError('Failed to delete workout')
      } finally {
        setIsDeleting(false)
      }
    },
    [onClose, onDeleteWorkout, onWorkoutDeleted],
  )

  return {
    isDuplicating,
    isDeleting,
    isDeleteDialogOpen,
    deleteError,
    duplicateError,
    actions: {
      duplicateWorkout,
      requestDelete,
      cancelDelete,
      confirmDelete,
    },
  }
}
