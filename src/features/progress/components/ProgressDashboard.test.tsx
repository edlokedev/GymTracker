import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExerciseProgress } from '@/lib/types/progress'
import { useProgressDashboard } from '../useProgressDashboard'
import ProgressDashboard from './ProgressDashboard'

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}))

vi.mock('../useProgressDashboard', () => ({
  useProgressDashboard: vi.fn(),
}))

const bench: ExerciseProgress = {
  exerciseId: 'bench',
  exerciseName: 'bench press',
  dataPoints: [
    {
      id: 'set-1',
      date: '2026-07-01',
      exerciseId: 'bench',
      exerciseName: 'bench press',
      weight: 100,
      reps: 5,
      volume: 500,
      durationSeconds: null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
      isPersonalRecord: false,
      sessionId: 'session-1',
      setNumber: 1,
    },
    {
      id: 'set-2',
      date: '2026-07-08',
      exerciseId: 'bench',
      exerciseName: 'bench press',
      weight: 110,
      reps: 5,
      volume: 550,
      durationSeconds: null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
      isPersonalRecord: true,
      sessionId: 'session-2',
      setNumber: 1,
    },
  ],
  personalRecords: {
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
    maxDuration: null,
    maxDistance: null,
    maxSpeed: null,
  },
  trends: {
    weight: 'up',
    reps: 'stable',
    volume: 'up',
    duration: 'stable',
    distance: 'stable',
    speed: 'stable',
  },
  statistics: {
    totalWorkouts: 2,
    averageWeight: 105,
    averageReps: 5,
    totalVolume: 1050,
    totalDurationSeconds: 0,
    totalDistanceKm: 0,
    averageSpeedKmh: null,
    improvementPercentage: 10,
  },
}

describe('ProgressDashboard', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('centers progress on one exercise with metric tabs and useful context', () => {
    const setSelectedExerciseId = vi.fn()
    vi.mocked(useProgressDashboard).mockReturnValue({
      state: {
        filters: {
          exerciseIds: [],
          dateRange: { start: '2026-06-01', end: '2026-07-08' },
          metric: 'weight',
        },
        data: [bench],
        selectedExerciseId: 'bench',
        isLoading: false,
        error: null,
      },
      chartPoints: bench.dataPoints.map((point) => ({
        date: point.date,
        value: point.weight ?? 0,
        exerciseName: point.exerciseName,
        isPersonalRecord: point.isPersonalRecord,
        volume: point.volume,
        weight: point.weight,
        reps: point.reps,
        durationSeconds: point.durationSeconds,
        distanceKm: point.distanceKm,
        speedKmh: point.speedKmh,
      })),
      actions: {
        setMetric: vi.fn(),
        setDatePreset: vi.fn(),
        setDateRange: vi.fn(),
        setExerciseIds: vi.fn(),
        setSelectedExerciseId,
        setFilters: vi.fn(),
        refresh: vi.fn(),
      },
    })

    render(<ProgressDashboard />)

    const exerciseSelect = screen.getByLabelText('Exercise')
    expect(exerciseSelect).toHaveValue('bench')
    expect(exerciseSelect).toHaveStyle({
      appearance: 'none',
      paddingRight: '48px',
    })
    expect(screen.getByTestId('exercise-select-chevron')).toHaveStyle({
      width: '16px',
      height: '16px',
      right: '16px',
      top: '50%',
    })
    expect(screen.queryByRole('button', { name: 'Volume' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weight' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(screen.getByText('Change')).toBeInTheDocument()
    expect(screen.getByText('Best in range')).toBeInTheDocument()
    expect(screen.queryByLabelText('Chart Type')).not.toBeInTheDocument()
    expect(screen.queryByText('Trend lines')).not.toBeInTheDocument()

    fireEvent.change(exerciseSelect, { target: { value: 'bench' } })
    expect(setSelectedExerciseId).toHaveBeenCalledWith('bench')
  })
})
