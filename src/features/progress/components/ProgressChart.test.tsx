import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ChartDataPoint } from '@/lib/types/progress'
import { buildSeries, linearTrend, ProgressChart } from './ProgressChart'

const point = (overrides: Partial<ChartDataPoint>): ChartDataPoint => ({
  date: '2026-07-01',
  value: 100,
  exerciseName: 'bench press',
  isPersonalRecord: false,
  volume: 100,
  weight: 50,
  reps: 10,
  durationSeconds: null,
  distanceKm: null,
  speedKmh: null,
  ...overrides,
})

const points: ChartDataPoint[] = [
  point({ date: '2026-07-01', value: 100 }),
  point({ date: '2026-07-03', value: 120, isPersonalRecord: true }),
  point({ date: '2026-07-01', value: 60, exerciseName: 'squat' }),
  point({ date: '2026-07-03', value: 80, exerciseName: 'squat' }),
]

describe('ProgressChart', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders one line per exercise with PR points highlighted', () => {
    const { container } = render(
      <ProgressChart
        points={points}
        chartType="line"
        showTrendLines={false}
        highlightPRs={true}
        metricLabel="Volume"
      />,
    )

    expect(screen.getByTestId('series-line-bench press')).toBeInTheDocument()
    expect(screen.getByTestId('series-line-squat')).toBeInTheDocument()
    expect(screen.getAllByTestId('pr-point')).toHaveLength(1)
    expect(container.querySelector('rect')).not.toBeInTheDocument()
  })

  it('renders bars instead of lines for bar type, and trend lines when enabled', () => {
    const { container } = render(
      <ProgressChart
        points={points}
        chartType="bar"
        showTrendLines={true}
        highlightPRs={false}
        metricLabel="Volume"
      />,
    )

    expect(screen.getAllByTestId('series-bar-squat')).toHaveLength(2)
    expect(container.querySelector('polyline')).not.toBeInTheDocument()
    expect(screen.getByTestId('trend-line-bench press')).toBeInTheDocument()
  })

  it('shows an empty message when there are no points', () => {
    render(
      <ProgressChart
        points={[]}
        chartType="line"
        showTrendLines={false}
        highlightPRs={false}
        metricLabel="Volume"
      />,
    )

    expect(
      screen.getByText('No data points for this metric in the selected period.'),
    ).toBeInTheDocument()
  })
})

describe('buildSeries', () => {
  it('groups points by exercise and maps higher values to smaller y (SVG up)', () => {
    const series = buildSeries(points)
    expect(series.map((s) => s.name).sort()).toEqual(['bench press', 'squat'])
    const bench = series.find((s) => s.name === 'bench press')
    expect(bench).toBeDefined()
    if (!bench) return
    expect(bench.points[1].y).toBeLessThan(bench.points[0].y)
  })
})

describe('linearTrend', () => {
  it('fits an upward slope through ascending points', () => {
    const trend = linearTrend([
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 30 },
    ])
    expect(trend).not.toBeNull()
    if (!trend) return
    expect(trend.y2).toBeGreaterThan(trend.y1)
  })

  it('returns null for fewer than two points or zero x-spread', () => {
    expect(linearTrend([{ x: 1, y: 1 }])).toBeNull()
    expect(
      linearTrend([
        { x: 5, y: 1 },
        { x: 5, y: 9 },
      ]),
    ).toBeNull()
  })
})
