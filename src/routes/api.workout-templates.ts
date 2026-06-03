import { createServerFileRoute } from '@tanstack/react-start/server'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest, notFound } from '../lib/api/errors'
import {
  type CreateWorkoutTemplateInput,
  type UpdateWorkoutTemplateInput,
  workoutTemplateQueries,
} from '../lib/supabase/queries/workout-templates'

export const getWorkoutTemplates = async ({ supabase, url }: PrivateHandlerContext) => {
  const id = url.searchParams.get('id')
  if (id) {
    const template = await workoutTemplateQueries.getById(supabase, id)
    if (!template) notFound('Template not found')
    return template
  }

  return workoutTemplateQueries.list(supabase)
}

export const createWorkoutTemplate = async ({ user, supabase, request }: PrivateHandlerContext) => {
  const input = (await request.json()) as CreateWorkoutTemplateInput
  const template = await workoutTemplateQueries.create(supabase, user.id, input)
  if (!template) notFound('Source workout not found')
  return template
}

export const updateWorkoutTemplate = async ({ supabase, request, url }: PrivateHandlerContext) => {
  const id = url.searchParams.get('id')
  if (!id) badRequest('Template ID is required')

  const input = (await request.json()) as UpdateWorkoutTemplateInput
  const template = await workoutTemplateQueries.update(supabase, id, input)
  if (!template) notFound('Template not found')
  return template
}

export const deleteWorkoutTemplate = async ({ supabase, url }: PrivateHandlerContext) => {
  const id = url.searchParams.get('id')
  if (!id) badRequest('Template ID is required')

  const archived = await workoutTemplateQueries.archive(supabase, id)
  if (!archived) notFound('Template not found')
  return {}
}

export const ServerRoute = createServerFileRoute('/api/workout-templates').methods({
  GET: privateMethod(getWorkoutTemplates),
  POST: privateMethod(createWorkoutTemplate),
  PUT: privateMethod(updateWorkoutTemplate),
  DELETE: privateMethod(deleteWorkoutTemplate),
})
