import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { ExerciseProgress } from '@/lib/types/progress'
import {
  applyProgressDatePreset,
  buildProgressChartPoints,
  createProgressState,
  findDatePresetForRange,
  getAvailableProgressMetrics,
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
      durationSeconds: null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
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
      durationSeconds: null,
      distanceKm: null,
      speedKmh: null,
      incline: null,
      isPersonalRecord: false,
      sessionId: 'session-1',
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
    averageWeight: 81.25,
    averageReps: 5,
    totalVolume: 812.5,
    totalDurationSeconds: 0,
    totalDistanceKm: 0,
    averageSpeedKmh: null,
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
    expect(state.filters.metric).toBe('weight')

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

  it('preserves personal-record metadata in chart points', () => {
    const points = buildProgressChartPoints([makeProgress()], 'volume')

    expect(points).toHaveLength(2)
    expect(points.some((point) => point.isPersonalRecord)).toBe(true)
  })

  it('builds chart points for cardio metrics', () => {
    const progress = makeProgress()
    progress.dataPoints[0].durationSeconds = 1800
    progress.dataPoints[0].distanceKm = 2.5
    progress.dataPoints[0].speedKmh = 5

    const durationPoints = buildProgressChartPoints([progress], 'duration')
    const distancePoints = buildProgressChartPoints([progress], 'distance')
    const speedPoints = buildProgressChartPoints([progress], 'speed')

    expect(durationPoints.at(-1)?.value).toBe(1800)
    expect(distancePoints.at(-1)?.value).toBe(2.5)
    expect(speedPoints.at(-1)?.value).toBe(5)
  })

  it('omits sets without the selected metric instead of drawing zeroes', () => {
    const progress = makeProgress()
    progress.dataPoints[0].durationSeconds = 1800

    const points = buildProgressChartPoints([progress], 'duration')

    expect(points.map((point) => point.value)).toEqual([1800])
  })

  it('shows one best set per workout for only the selected exercise', () => {
    const bench = makeProgress()
    bench.dataPoints.push({
      ...bench.dataPoints[1],
      id: 'set-1-backoff',
      weight: 75,
      volume: 450,
      setNumber: 2,
    })
    const squat = makeProgress()
    squat.exerciseId = 'squat'
    squat.exerciseName = 'Back Squat'
    squat.dataPoints = squat.dataPoints.map((point) => ({
      ...point,
      exerciseId: 'squat',
      exerciseName: 'Back Squat',
    }))

    const points = buildProgressChartPoints([bench, squat], 'weight', {
      exerciseId: 'bench',
    })

    expect(points.map((point) => point.value)).toEqual([80, 82.5])
    expect(points.every((point) => point.exerciseName === 'Bench Press')).toBe(true)
  })

  it('offers only metrics recorded for the selected exercise', () => {
    const cardio = makeProgress()
    cardio.dataPoints = cardio.dataPoints.map((point) => ({
      ...point,
      weight: null,
      reps: null,
      volume: 0,
      durationSeconds: 1800,
      distanceKm: 2.5,
      speedKmh: 5,
    }))

    expect(getAvailableProgressMetrics(cardio)).toEqual(['duration', 'distance', 'speed'])
  })
})
