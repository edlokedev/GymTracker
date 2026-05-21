// Seed Supabase catalog tables (exercise_categories + exercises) from the
// bundled Free Exercise DB JSON. Image paths are converted to jsDelivr URLs so
// the catalog never depends on Supabase Storage during the first migration.
//
// Run with:
//   pnpm supabase:seed-exercises
// or:
//   tsx src/lib/supabase/seed/seed-exercises.ts
//
// Requires SUPABASE_URL and SUPABASE_SECRET_KEY (sb_secret_…; legacy alias
// SUPABASE_SERVICE_ROLE_KEY also accepted) in the environment. The secret key
// bypasses RLS, so do not commit a real key.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSupabaseServiceRoleClient } from '../server'

const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/'

type FreeExerciseDBExercise = {
  id: string
  name: string
  category: string
  force: string | null
  level: string | null
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]
}

const CATEGORIES = [
  {
    id: 'strength',
    name: 'Strength',
    description: 'Strength training exercises including weightlifting and resistance training',
  },
  {
    id: 'cardio',
    name: 'Cardio',
    description: 'Cardiovascular exercises for endurance and heart health',
  },
  { id: 'stretching', name: 'Stretching', description: 'Flexibility and mobility exercises' },
  { id: 'plyometrics', name: 'Plyometrics', description: 'Explosive power and jumping exercises' },
  {
    id: 'powerlifting',
    name: 'Powerlifting',
    description: 'Powerlifting focused exercises (squat, bench, deadlift variations)',
  },
  {
    id: 'olympic-weightlifting',
    name: 'Olympic Weightlifting',
    description: 'Olympic lifting movements (snatch, clean & jerk, etc.)',
  },
  {
    id: 'strongman',
    name: 'Strongman',
    description: 'Strongman training exercises with specialized equipment',
  },
]

function mapCategory(raw: string): string {
  const map: Record<string, string> = {
    strength: 'strength',
    cardio: 'cardio',
    stretching: 'stretching',
    plyometrics: 'plyometrics',
    powerlifting: 'powerlifting',
    'olympic weightlifting': 'olympic-weightlifting',
    strongman: 'strongman',
  }
  return map[raw] ?? 'strength'
}

function toJsDelivrUrl(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, '')
  return `${JSDELIVR_BASE}${trimmed}`
}

async function main() {
  const supabase = getSupabaseServiceRoleClient()

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const dataPath = join(__dirname, '../../database/data/exercises.json')

  const raw = readFileSync(dataPath, 'utf-8')
  const exercises: FreeExerciseDBExercise[] = JSON.parse(raw)

  console.log(`Upserting ${CATEGORIES.length} categories…`)
  const { error: catErr } = await supabase
    .from('exercise_categories')
    .upsert(CATEGORIES, { onConflict: 'id' })
  if (catErr) throw catErr

  console.log(`Upserting ${exercises.length} exercises…`)

  const rows = exercises.map((ex) => ({
    id: ex.id,
    name: ex.name,
    category_id: mapCategory(ex.category),
    force: ex.force,
    level: ex.level,
    mechanic: ex.mechanic,
    equipment: ex.equipment,
    primary_muscles: ex.primaryMuscles ?? [],
    secondary_muscles: ex.secondaryMuscles ?? [],
    instructions: ex.instructions ?? [],
    images: (ex.images ?? []).map(toJsDelivrUrl),
  }))

  // Supabase recommends chunking large upserts to keep request size bounded.
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('exercises').upsert(slice, { onConflict: 'id' })
    if (error) throw error
    console.log(`  …${Math.min(i + CHUNK, rows.length)} / ${rows.length}`)
  }

  console.log('Catalog seed complete.')
}

main().catch((err) => {
  console.error('Catalog seed failed:', err)
  process.exit(1)
})
