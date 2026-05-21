import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { ExerciseProgress } from '@/lib/types/progress'
import {
  applyProgressDatePreset,
  buildProgressChartPoints,
  createProgressState,
  findDatePresetForRange,
  summarizeProgress,
} from './model'

const makeProgress = (): ExerciseProgress => ({
  exerciseId: 'bench',
  exerciseName: 'Bench Press',
  dataPoints: [
    {
      id: 'set-2',
      date: '2026-01-03',
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      weight: 82.5,
      reps: 5,
      volume: 412.5,
      isPersonalRecord: true,
      sessionId: 'session-2',
      setNumber: 1,
    },
    {
      id: 'set-1',
      date: '2026-01-01',
      exerciseId: 'bench',
      exerciseName: 'Bench Press',
      weight: 80,
      reps: 5,
      volume: 400,
      isPersonalRecord: false,
      sessionId: 'session-1',
      setNumber: 1,
    },
  ],
  personalRecords: {
    maxWeight: null,
    maxReps: null,
    maxVolume: null,
  },
  trends: {
    weight: 'up',
    reps: 'stable',
    volume: 'up',
  },
  statistics: {
    totalWorkouts: 2,
    averageWeight: 81.25,
    averageReps: 5,
    totalVolume: 812.5,
    improvementPercentage: 3.1,
  },
})

describe('progress model', () => {
  it('creates default 90 day state and applies date presets', () => {
    const now = dayjs('2026-05-15')
    const state = createProgressState(now)

    expect(state.filters.dateRange).toEqual({
      start: '2026-02-14',
      end: '2026-05-15',
    })
    expect(state.filters.metric).toBe('volume')

    const nextFilters = applyProgressDatePreset(state.filters, '30d', now)
    expect(nextFilters.dateRange).toEqual({
      start: '2026-04-15',
      end: '2026-05-15',
    })
    expect(findDatePresetForRange(nextFilters.dateRange, now)?.value).toBe('30d')
  })

  it('builds chart-ready points in chronological order', () => {
    const points = buildProgressChartPoints([makeProgress()], 'weight')

    expect(points.map((point) => point.date)).toEqual(['2026-01-01', '2026-01-03'])
    expect(points.map((point) => point.value)).toEqual([80, 82.5])
    expect(points[1]).toMatchObject({
      exerciseName: 'Bench Press',
      isPersonalRecord: true,
      volume: 412.5,
    })
  })

  it('can omit personal records from chart-ready points', () => {
    const points = buildProgressChartPoints([makeProgress()], 'volume', {
      highlightPRs: false,
    })

    expect(points).toHaveLength(1)
    expect(points[0].isPersonalRecord).toBe(false)
  })

  it('summarizes dashboard totals', () => {
    const progress = makeProgress()
    progress.personalRecords.maxWeight = progress.dataPoints[1]
    progress.personalRecords.maxVolume = progress.dataPoints[0]

    expect(summarizeProgress([progress])).toEqual({
      exercisesTracked: 1,
      totalWorkouts: 2,
      personalRecords: 2,
    })
  })
})
