// Seed Supabase catalog tables from the upstream `hasaneyldrm/exercises-dataset`
// repo. Image + GIF paths are rewritten to absolute jsDelivr URLs so the
// catalog renders without depending on Supabase Storage.
//
// Run with:
//   bun run supabase:seed-exercises
// or:
//   tsx src/lib/supabase/seed/seed-exercises.ts
//
// Requires SUPABASE_URL and SUPABASE_SECRET_KEY (sb_secret_…; legacy alias
// SUPABASE_SERVICE_ROLE_KEY also accepted) in the environment. The secret
// key bypasses RLS — do not commit a real key.
//
// The seed is destructive: it deletes every row in `exercises` and
// `exercise_categories` before inserting the upstream dataset, so the catalog
// always exactly mirrors the linked source.

import { basename } from 'node:path'
import { type ExerciseTrackingType, getTrackingType } from '../../utils/exercise-tracking'
import { getSupabaseServiceRoleClient } from '../server'

const DATASET_REPO = 'hasaneyldrm/exercises-dataset'
const DATASET_BRANCH = 'main'
const DATASET_JSON_URL = `https://raw.githubusercontent.com/${DATASET_REPO}/${DATASET_BRANCH}/data/exercises.json`
const JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${DATASET_REPO}@${DATASET_BRANCH}`

interface UpstreamExercise {
  id: string
  name: string
  category?: string
  body_part?: string
  equipment?: string
  instructions?: { en?: string; tr?: string }
  muscle_group?: string
  secondary_muscles?: string[]
  target?: string
  image?: string
  gif_url?: string
  created_at?: string
}

interface NormalizedCategory {
  id: string
  name: string
  description: string
}

interface NormalizedExerciseRow {
  id: string
  name: string
  category_id: string
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primary_muscles: string[]
  secondary_muscles: string[]
  instructions: string[]
  images: string[]
  gif_path: string | null
  preview_image_path: string | null
  tracking_type: ExerciseTrackingType
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function slugifyCategoryId(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toTitleCase(value: string): string {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(
      /(^|[^a-z0-9])([a-z])/g,
      (_, prefix: string, letter: string) => prefix + letter.toUpperCase(),
    )
}

function normalizeMuscle(value: string): string {
  return normalizeWhitespace(value).toLowerCase()
}

function uniqueMuscles(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    if (!value) continue
    const normalized = normalizeMuscle(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function splitInstructionText(text: string | undefined): string[] {
  if (!text) return []
  const normalized = normalizeWhitespace(text)
  if (!normalized) return []
  const parts = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((p) => p.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [normalized]
}

function toJsDelivrUrl(folder: 'videos' | 'images', sourcePath: string | undefined): string | null {
  if (!sourcePath) return null
  const filename = basename(sourcePath.trim())
  if (!filename) return null
  return `${JSDELIVR_BASE}/${folder}/${filename}`
}

function normalize(upstream: UpstreamExercise): {
  category: NormalizedCategory
  exercise: NormalizedExerciseRow
} | null {
  if (!upstream.id || !upstream.name) return null

  const categoryName = upstream.body_part || upstream.category
  if (!categoryName) return null

  const categoryId = slugifyCategoryId(categoryName)
  if (!categoryId) return null

  const primaryMuscles = uniqueMuscles([upstream.target])
  const secondaryMuscles = uniqueMuscles([
    upstream.muscle_group,
    ...(upstream.secondary_muscles ?? []),
  ]).filter((m) => !primaryMuscles.includes(m))

  return {
    category: {
      id: categoryId,
      name: toTitleCase(categoryName),
      description: `${toTitleCase(categoryName)} exercises from the synced exercise dataset`,
    },
    exercise: {
      id: upstream.id,
      name: normalizeWhitespace(upstream.name),
      category_id: categoryId,
      force: null,
      level: null,
      mechanic: null,
      equipment: upstream.equipment ? normalizeMuscle(upstream.equipment) : null,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      instructions: splitInstructionText(upstream.instructions?.en),
      images: [],
      gif_path: toJsDelivrUrl('videos', upstream.gif_url),
      preview_image_path: toJsDelivrUrl('images', upstream.image),
      tracking_type: getTrackingType({ categoryName, force: null }),
    },
  }
}

async function main() {
  const supabase = getSupabaseServiceRoleClient()

  console.log(`Fetching ${DATASET_JSON_URL}…`)
  const response = await fetch(DATASET_JSON_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'GymTracker seed' },
  })
  if (!response.ok) {
    throw new Error(`Upstream fetch failed: ${response.status} ${response.statusText}`)
  }
  const upstream = (await response.json()) as UpstreamExercise[]
  console.log(`Got ${upstream.length} upstream rows`)

  const categories = new Map<string, NormalizedCategory>()
  const exercises: NormalizedExerciseRow[] = []
  let skipped = 0
  for (const raw of upstream) {
    const result = normalize(raw)
    if (!result) {
      skipped++
      continue
    }
    categories.set(result.category.id, result.category)
    exercises.push(result.exercise)
  }
  console.log(
    `Normalized: ${exercises.length} exercises, ${categories.size} categories (${skipped} skipped)`,
  )

  // Destructive reset of catalog: rows from the legacy Free Exercise DB seed
  // would otherwise linger alongside the new ones with mismatched ids.
  console.log('Clearing existing catalog rows…')
  const { error: delSetsErr } = await supabase.from('workout_sets').delete().gt('set_number', -1)
  if (delSetsErr) throw delSetsErr
  const { error: delExErr } = await supabase.from('exercises').delete().neq('id', '__sentinel__')
  if (delExErr) throw delExErr
  const { error: delCatErr } = await supabase
    .from('exercise_categories')
    .delete()
    .neq('id', '__sentinel__')
  if (delCatErr) throw delCatErr

  console.log(`Upserting ${categories.size} categories…`)
  const categoryRows = Array.from(categories.values()) as unknown as Record<string, unknown>[]
  const { error: catErr } = await supabase
    .from('exercise_categories')
    .upsert(categoryRows, { onConflict: 'id' })
  if (catErr) throw catErr

  console.log(`Upserting ${exercises.length} exercises…`)
  const CHUNK = 500
  for (let i = 0; i < exercises.length; i += CHUNK) {
    const slice = exercises.slice(i, i + CHUNK) as unknown as Record<string, unknown>[]
    const { error } = await supabase.from('exercises').upsert(slice, { onConflict: 'id' })
    if (error) throw error
    console.log(`  …${Math.min(i + CHUNK, exercises.length)} / ${exercises.length}`)
  }

  console.log('Catalog seed complete.')
}

main().catch((err) => {
  console.error('Catalog seed failed:', err)
  process.exit(1)
})
