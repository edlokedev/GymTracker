import { describe, expect, it, vi } from 'vitest'
import { stubSupabase } from '../../../../tests/contract/stub-supabase'
import { exerciseCatalogQueries } from './exercise-catalog'

function exercise(name: string, primary: string[], secondary: string[] = []) {
  const json = (values: string[]) => JSON.stringify(values).replace(/,/g, ', ')
  return {
    id: name,
    name,
    category_id: 'strength',
    tracking_type: 'strength',
    force: null,
    level: null,
    mechanic: null,
    equipment: null,
    primary_muscles: primary,
    secondary_muscles: secondary,
    instructions: [],
    gif_path: null,
    preview_image_path: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    exercise_categories: { name: 'Strength' },
    search_text: `${name} ${json(primary)} ${json(secondary)}`.toLowerCase(),
    primary_muscles_text: json(primary).toLowerCase(),
  }
}

describe('catalog SQL text search', () => {
  const rows = [
    exercise('Bench Press', ['chest'], ['triceps']),
    exercise('Cable Fly', ['upper chest']),
    exercise('Chest Dip', ['chest']),
    exercise('Odd 100%_\\" move', ['forearms']),
    exercise('Odd 100abc move', ['forearms']),
    exercise('Row, "Wide"', ['upper back']),
  ]

  it.each([
    ['chest', ['Bench Press', 'Cable Fly', 'Chest Dip']],
    ['upper chest', ['Cable Fly']],
    ['bench press', ['Bench Press']],
    ['triceps', ['Bench Press']],
    ['%', ['Odd 100%_\\" move']],
    ['_', ['Odd 100%_\\" move']],
    ['row, "wide"', ['Row, "Wide"']],
    ['100%_\\"', ['Odd 100%_\\" move']],
  ])('matches literal query %s', async (query, names) => {
    const client = stubSupabase({ exercises: rows })
    const from = vi.spyOn(client, 'from')
    const result = await exerciseCatalogQueries.search(client, { query })
    expect(result.data.map((row) => row.name)).toEqual(names)
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('combines general and primary muscle filters', async () => {
    const client = stubSupabase({ exercises: rows })
    const result = await exerciseCatalogQueries.search(client, {
      query: 'chest',
      primary_muscle: 'upper',
    })
    expect(result.data.map((row) => row.name)).toEqual(['Cable Fly'])
  })

  it('filters primary muscle and paginates ordered results with exact total', async () => {
    const client = stubSupabase({ exercises: rows })
    const result = await exerciseCatalogQueries.search(client, {
      primary_muscle: 'chest',
      limit: 1,
      offset: 1,
    })
    expect(result.data.map((row) => row.name)).toEqual(['Cable Fly'])
    expect(result).toMatchObject({ total: 3, page: 2, limit: 1, hasMore: true })
  })

  it('fetches only one page even when more than 1000 rows match', async () => {
    const client = stubSupabase({
      exercises: Array.from({ length: 1001 }, (_, i) => exercise(`Row ${i}`, ['back'])),
    })
    const from = vi.spyOn(client, 'from')
    const result = await exerciseCatalogQueries.search(client, {
      query: 'row',
      limit: 10,
      offset: 20,
    })
    expect(result.total).toBe(1001)
    expect(result.data).toHaveLength(10)
    expect(from).toHaveBeenCalledTimes(1)
  })
})
