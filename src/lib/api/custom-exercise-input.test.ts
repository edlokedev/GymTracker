import { describe, expect, it } from 'vitest'
import {
  assertOwnedExerciseImageUrl,
  ownedImagePrefix,
  toCustomExerciseInput,
} from './custom-exercise-input'

const SUPA = 'https://proj.supabase.co'
const USER = 'user-1'
const ownUrl = `${SUPA}/storage/v1/object/public/exercise-images/${USER}/custom-1/preview.webp`

describe('assertOwnedExerciseImageUrl', () => {
  it('returns null for empty/whitespace/undefined', () => {
    expect(assertOwnedExerciseImageUrl(null, USER, SUPA)).toBeNull()
    expect(assertOwnedExerciseImageUrl('   ', USER, SUPA)).toBeNull()
    expect(assertOwnedExerciseImageUrl(undefined, USER, SUPA)).toBeNull()
  })

  it('accepts a URL under the caller’s own bucket folder', () => {
    expect(assertOwnedExerciseImageUrl(ownUrl, USER, SUPA)).toBe(ownUrl)
  })

  it('rejects an arbitrary external URL', () => {
    expect(() => assertOwnedExerciseImageUrl('https://evil.example/x.gif', USER, SUPA)).toThrow()
  })

  it('rejects a URL in another user’s folder', () => {
    const otherUrl = `${SUPA}/storage/v1/object/public/exercise-images/user-2/x/p.webp`
    expect(() => assertOwnedExerciseImageUrl(otherUrl, USER, SUPA)).toThrow()
  })

  it('builds a trailing-slash-safe prefix', () => {
    expect(ownedImagePrefix('https://proj.supabase.co/', USER)).toBe(
      `${SUPA}/storage/v1/object/public/exercise-images/${USER}/`,
    )
  })
})

describe('toCustomExerciseInput', () => {
  it('trims, lowercases facets, dedupes, and guards images', () => {
    const input = toCustomExerciseInput(
      {
        name: '  Pendlay Row ',
        category_id: ' strength ',
        tracking_type: 'strength',
        equipment: ' Barbell ',
        primary_muscles: [' Back ', 'back', ''],
        secondary_muscles: ['Biceps'],
        instructions: [' Pull ', ''],
        gif_path: ownUrl,
        preview_image_path: null,
      },
      USER,
      SUPA,
    )
    expect(input).toEqual({
      name: 'Pendlay Row',
      category_id: 'strength',
      tracking_type: 'strength',
      equipment: 'barbell',
      primary_muscles: ['back'],
      secondary_muscles: ['biceps'],
      instructions: ['Pull'],
      gif_path: ownUrl,
      preview_image_path: null,
    })
  })

  it('rejects a body whose image URL is not owned', () => {
    expect(() =>
      toCustomExerciseInput(
        {
          name: 'X',
          category_id: 'strength',
          tracking_type: 'strength',
          gif_path: 'https://evil.example/x.gif',
        },
        USER,
        SUPA,
      ),
    ).toThrow()
  })
})
