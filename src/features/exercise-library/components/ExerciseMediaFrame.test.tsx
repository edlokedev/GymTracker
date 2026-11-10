import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ExerciseWithParsedFields } from '@/lib/types/database'
import ExerciseMediaFrame from './ExerciseMediaFrame'

const exercise = (gif: string | null, preview: string | null) =>
  ({ gif_path: gif, preview_image_path: preview }) as unknown as ExerciseWithParsedFields

function renderFrame(ex: ExerciseWithParsedFields) {
  return render(
    <ExerciseMediaFrame
      exercise={ex}
      alt="Squat"
      frameClassName="frame"
      imageClassName="img"
      iconClassName="icon"
    />,
  )
}

describe('ExerciseMediaFrame', () => {
  afterEach(cleanup)

  it('renders no <img> when the exercise has no media (fallback icon shows)', () => {
    const { container } = renderFrame(exercise(null, null))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('.icon svg')).not.toBeNull()
  })

  it('keeps the animated gif as the primary source', () => {
    renderFrame(exercise('https://cdn.example.com/a.gif', 'https://cdn.example.com/a.png'))
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/a.gif')
  })

  it('falls back to the preview, then removes the <img> when both fail', () => {
    renderFrame(exercise('https://cdn.example.com/a.gif', 'https://cdn.example.com/a.png'))
    fireEvent.error(screen.getByRole('img'))
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/a.png')
    fireEvent.error(screen.getByRole('img'))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
