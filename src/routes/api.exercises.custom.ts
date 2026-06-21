import { createServerFileRoute } from '@tanstack/react-start/server'
import { customExerciseBodySchema } from '../lib/api/contracts/exercises.custom.contract'
import { toCustomExerciseInput } from '../lib/api/custom-exercise-input'
import { type PrivateHandlerContext, privateMethod } from '../lib/api/define-private-route'
import { badRequest } from '../lib/api/errors'
import { env } from '../lib/env'
import { exerciseCustomQueries } from '../lib/supabase/queries/exercise-custom'

async function parseBody({ request, user }: PrivateHandlerContext) {
  const raw = await request.json().catch(() => null)
  const parsed = customExerciseBodySchema.safeParse(raw)
  if (!parsed.success) {
    badRequest(parsed.error.issues[0]?.message ?? 'Invalid exercise')
  }
  return toCustomExerciseInput(parsed.data, user.id, env.SUPABASE_URL)
}

function requireId(ctx: PrivateHandlerContext): string {
  const id = ctx.url.searchParams.get('id')
  if (!id) badRequest('id is required')
  return id
}

export const listCustomExercises = async ({ supabase, user }: PrivateHandlerContext) => {
  return await exerciseCustomQueries.listOwn(supabase, user.id)
}

export const createCustomExercise = async (ctx: PrivateHandlerContext) => {
  const input = await parseBody(ctx)
  return await exerciseCustomQueries.create(ctx.supabase, ctx.user.id, input)
}

export const updateCustomExercise = async (ctx: PrivateHandlerContext) => {
  const id = requireId(ctx)
  const input = await parseBody(ctx)
  return await exerciseCustomQueries.update(ctx.supabase, ctx.user.id, id, input)
}

export const archiveCustomExercise = async (ctx: PrivateHandlerContext) => {
  const id = requireId(ctx)
  return await exerciseCustomQueries.archive(ctx.supabase, ctx.user.id, id)
}

export const ServerRoute = createServerFileRoute('/api/exercises/custom').methods({
  GET: privateMethod(listCustomExercises),
  POST: privateMethod(createCustomExercise),
  PATCH: privateMethod(updateCustomExercise),
  DELETE: privateMethod(archiveCustomExercise),
})
