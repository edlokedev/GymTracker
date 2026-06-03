import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { workoutTemplateQueries } from '../lib/supabase/queries/workout-templates'

export const getNextWorkout = async ({ supabase }: PrivateHandlerContext) => {
  return workoutTemplateQueries.nextWorkout(supabase)
}

export const ServerRoute = createServerFileRoute('/api/next-workout').methods({
  GET: privateMethod(getNextWorkout),
})
