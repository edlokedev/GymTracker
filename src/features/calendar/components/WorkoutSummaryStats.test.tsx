import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WorkoutSummaryStats } from './WorkoutSummaryStats'

const stats = (lastWorkoutDate: string) => ({
  totalWorkouts: 1,
  totalVolume: 0,
  averageWorkoutsPerWeek: 1,
  longestStreak: 1,
  currentStreak: 1,
  lastWorkoutDate,
  workoutsThisMonth: 1,
})

describe('WorkoutSummaryStats last workout label', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 4, 15, 14, 30))
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each([
    ['2026-05-15', 'Today'],
    ['2026-05-14', 'Yesterday'],
    ['2026-05-12', '3 days ago'],
    ['2026-05-01', '2 weeks ago'],
  ])('labels %s as %s', (date, label) => {
    render(<WorkoutSummaryStats stats={stats(date)} isLoading={false} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
