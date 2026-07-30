import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChartDataPoint } from '@/lib/types/progress'
import { buildChartGeometry, getProgressChartDimensions, ProgressChart } from './ProgressChart'

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
    vi.unstubAllGlobals()
  })

  it('renders one focused series with its best workout emphasized and no legend', () => {
    const benchPoints = points.filter((item) => item.exerciseName === 'bench press')
    const { container } = render(<ProgressChart points={benchPoints} metricLabel="Weight" />)

    expect(screen.getByTestId('series-line-bench press')).toBeInTheDocument()
    expect(screen.getAllByTestId('chart-point')).toHaveLength(2)
    expect(screen.getByTestId('best-point')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(container.querySelector('rect')).not.toBeInTheDocument()
  })

  it('uses one accessible line chart instead of visualization mode controls', () => {
    const benchPoints = points.filter((item) => item.exerciseName === 'bench press')
    const { container } = render(<ProgressChart points={benchPoints} metricLabel="Volume" />)

    const chart = screen.getByRole('img', {
      name: 'Bench Press Volume progress across 2 workouts',
    })
    expect(chart).toHaveAttribute('viewBox', '0 0 720 200')
    expect(chart).not.toHaveClass('min-h-56')
    expect(screen.getByTestId('series-line-bench press')).toBeInTheDocument()
    expect(container.querySelector('rect')).not.toBeInTheDocument()
    expect(container.querySelector('[data-testid^="trend-line-"]')).not.toBeInTheDocument()
  })

  it('shows an empty message when there are no points', () => {
    render(<ProgressChart points={[]} metricLabel="Volume" />)

    expect(screen.getByText('No volume data in this period.')).toBeInTheDocument()
  })

  it('starts responsive sizing when data appears after the empty state', () => {
    const observe = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe
        disconnect = vi.fn()
      },
    )
    const { rerender } = render(<ProgressChart points={[]} metricLabel="Weight" />)

    rerender(<ProgressChart points={points.slice(0, 2)} metricLabel="Weight" />)

    expect(observe).toHaveBeenCalledTimes(1)
  })
})

describe('buildChartGeometry', () => {
  it('keeps the chart compact on desktop and readable on mobile', () => {
    expect(getProgressChartDimensions(390)).toEqual({ width: 390, height: 180 })
    expect(getProgressChartDimensions(1169)).toEqual({ width: 1169, height: 200 })
  })

  it('maps higher values upward without forcing a zero baseline', () => {
    const geometry = buildChartGeometry(
      points.filter((item) => item.exerciseName === 'bench press'),
    )

    expect(geometry.points[1].y).toBeLessThan(geometry.points[0].y)
    expect(geometry.domainMin).toBeGreaterThan(0)
    expect(geometry.points[1].isBest).toBe(true)
  })
})
