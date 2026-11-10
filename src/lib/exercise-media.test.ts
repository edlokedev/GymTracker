import { describe, expect, it } from 'vitest'
import { getExerciseMediaUrls } from './exercise-media'

describe('getExerciseMediaUrls', () => {
  it('returns null urls and no placeholder when an exercise has no media', () => {
    const urls = getExerciseMediaUrls({ gif_path: null, preview_image_path: null } as never)
    expect(urls).toEqual({ gifUrl: null, previewImageUrl: null })
  })

  it('passes absolute urls through and resolves relative paths locally', () => {
    const urls = getExerciseMediaUrls({
      gif_path: 'https://cdn.example.com/a.gif',
      preview_image_path: '/b.png',
    } as never)
    expect(urls.gifUrl).toBe('https://cdn.example.com/a.gif')
    expect(urls.previewImageUrl).toBe('/images/exercises/b.png')
  })
})
