import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExerciseBrowserFilters } from './ExerciseBrowserFilters'

function renderFilters(query: string, onQueryChange = vi.fn()) {
  const props = {
    query,
    activeFilterCount: 0,
    activeFilterChips: [],
    categoryOptions: [],
    equipmentOptions: [],
    muscleOptions: [],
    selectedCategoryIds: [],
    selectedEquipment: [],
    selectedMuscleGroups: [],
    favouritesCount: 0,
    isFavouritesActive: false,
    onQueryChange,
    onToggleCategory: vi.fn(),
    onToggleEquipment: vi.fn(),
    onToggleMuscleGroup: vi.fn(),
    onToggleFavourites: vi.fn(),
    onRemoveFilter: vi.fn(),
    onResetFilters: vi.fn(),
  }
  const view = render(<ExerciseBrowserFilters {...props} />)
  return {
    onQueryChange,
    rerenderWith: (nextQuery: string) =>
      view.rerender(<ExerciseBrowserFilters {...props} query={nextQuery} />),
    unmount: view.unmount,
  }
}

describe('ExerciseBrowserFilters search input', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('debounces keystrokes into one query change', () => {
    const { onQueryChange } = renderFilters('')
    const input = screen.getByLabelText('Search exercises')

    fireEvent.change(input, { target: { value: 'b' } })
    fireEvent.change(input, { target: { value: 'be' } })
    fireEvent.change(input, { target: { value: 'ben' } })
    expect(input).toHaveValue('ben')
    expect(onQueryChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onQueryChange).toHaveBeenCalledTimes(1)
    expect(onQueryChange).toHaveBeenCalledWith('ben')
  })

  it('reflects external query changes (back/forward, reset filters)', () => {
    const { rerenderWith, onQueryChange } = renderFilters('squat')
    const input = screen.getByLabelText('Search exercises')
    expect(input).toHaveValue('squat')

    fireEvent.change(input, { target: { value: 'squatx' } })
    rerenderWith('')
    expect(input).toHaveValue('')

    // The pending debounce for the superseded text must not fire afterwards.
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onQueryChange).not.toHaveBeenCalled()
  })

  it('does not overwrite newer typing when its own commit echoes back', () => {
    const { rerenderWith, onQueryChange } = renderFilters('')
    const input = screen.getByLabelText('Search exercises')

    fireEvent.change(input, { target: { value: 'ben' } })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.change(input, { target: { value: 'benc' } })
    rerenderWith('ben')
    expect(input).toHaveValue('benc')

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onQueryChange).toHaveBeenLastCalledWith('benc')
  })

  it('clears the pending debounce on unmount', () => {
    const { onQueryChange, unmount } = renderFilters('')
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'x' } })
    unmount()
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onQueryChange).not.toHaveBeenCalled()
  })
})
