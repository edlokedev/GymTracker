import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChartDataPoint } from '@/lib/types/progress'
import { formatExerciseName } from '@/lib/utils/text'

const CHART_WIDTH = 720
const CHART_HEIGHT = 200
const MOBILE_CHART_BREAKPOINT = 640
const MOBILE_CHART_HEIGHT = 180
const PAD_LEFT = 52
const PAD_RIGHT = 18
const PAD_TOP = 12
const PAD_BOTTOM = 30

interface ProgressChartDimensions {
  width: number
  height: number
}

const DEFAULT_CHART_DIMENSIONS: ProgressChartDimensions = {
  width: CHART_WIDTH,
  height: CHART_HEIGHT,
}

interface GeometryPoint {
  x: number
  y: number
  source: ChartDataPoint
  isBest: boolean
}

interface ChartGeometry {
  points: GeometryPoint[]
  domainMin: number
  domainMax: number
}

export interface ProgressChartProps {
  points: ChartDataPoint[]
  metricLabel: string
}

export function getProgressChartDimensions(containerWidth: number): ProgressChartDimensions {
  const width = Math.max(280, Math.round(containerWidth))
  return {
    width,
    height: width < MOBILE_CHART_BREAKPOINT ? MOBILE_CHART_HEIGHT : CHART_HEIGHT,
  }
}

export function buildChartGeometry(
  points: ChartDataPoint[],
  dimensions = DEFAULT_CHART_DIMENSIONS,
): ChartGeometry {
  const sortedPoints = points
    .filter((point) => Number.isFinite(point.value))
    .sort((left, right) => left.date.localeCompare(right.date))

  if (sortedPoints.length === 0) {
    return { points: [], domainMin: 0, domainMax: 1 }
  }

  const values = sortedPoints.map((point) => point.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue
  const domainPadding = valueRange > 0 ? valueRange * 0.15 : Math.max(Math.abs(maxValue) * 0.1, 1)
  const domainMin = Math.max(0, minValue - domainPadding)
  const domainMax = maxValue + domainPadding
  const domainSpan = Math.max(domainMax - domainMin, 1)
  const parsedDates = sortedPoints.map((point) => Date.parse(point.date))
  const minDate = Math.min(...parsedDates)
  const maxDate = Math.max(...parsedDates)
  const dateSpan = Math.max(maxDate - minDate, 1)
  const plotWidth = dimensions.width - PAD_LEFT - PAD_RIGHT
  const plotHeight = dimensions.height - PAD_TOP - PAD_BOTTOM

  return {
    points: sortedPoints.map((point, index) => ({
      x:
        sortedPoints.length === 1
          ? PAD_LEFT + plotWidth / 2
          : PAD_LEFT + ((parsedDates[index] - minDate) / dateSpan) * plotWidth,
      y: PAD_TOP + ((domainMax - point.value) / domainSpan) * plotHeight,
      source: point,
      isBest: point.value === maxValue,
    })),
    domainMin,
    domainMax,
  }
}

export function ProgressChart({ points, metricLabel }: ProgressChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState(DEFAULT_CHART_DIMENSIONS)
  const geometry = useMemo(() => buildChartGeometry(points, dimensions), [dimensions, points])
  const hasChartPoints = geometry.points.length > 0

  useEffect(() => {
    const container = containerRef.current
    if (!hasChartPoints || !container || typeof ResizeObserver === 'undefined') return

    const updateDimensions = (width: number) => {
      if (width <= 0) return
      const nextDimensions = getProgressChartDimensions(width)
      setDimensions((currentDimensions) =>
        currentDimensions.width === nextDimensions.width &&
        currentDimensions.height === nextDimensions.height
          ? currentDimensions
          : nextDimensions,
      )
    }

    updateDimensions(container.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) updateDimensions(width)
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [hasChartPoints])

  if (!hasChartPoints) {
    return (
      <p className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        No {metricLabel.toLowerCase()} data in this period.
      </p>
    )
  }

  const exerciseName = formatExerciseName(geometry.points[0].source.exerciseName)
  const gridFractions = [0, 0.5, 1]
  const firstPoint = geometry.points[0]
  const lastPoint = geometry.points.at(-1) ?? firstPoint
  const linePoints = geometry.points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div ref={containerRef} className="w-full">
      <svg
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="block w-full overflow-visible"
        style={{ height: dimensions.height }}
        role="img"
        aria-label={`${exerciseName} ${metricLabel} progress across ${geometry.points.length} workouts`}
      >
        {gridFractions.map((fraction) => {
          const plotHeight = dimensions.height - PAD_TOP - PAD_BOTTOM
          const y = PAD_TOP + fraction * plotHeight
          const value = geometry.domainMax - fraction * (geometry.domainMax - geometry.domainMin)

          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={dimensions.width - PAD_RIGHT}
                y1={y}
                y2={y}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px] dark:fill-slate-400"
              >
                {formatAxisValue(value)}
              </text>
            </g>
          )
        })}

        {geometry.points.length > 1 && (
          <polyline
            data-testid={`series-line-${geometry.points[0].source.exerciseName}`}
            points={linePoints}
            fill="none"
            className="stroke-blue-500 dark:stroke-blue-400"
            strokeWidth={3}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {geometry.points.map((point, index) => (
          <g
            key={`${point.source.date}-${index}`}
            data-testid={point.isBest ? 'best-point' : undefined}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={point.isBest ? 6 : 4}
              className={
                point.isBest
                  ? 'fill-blue-500 stroke-amber-500 dark:fill-blue-400'
                  : 'fill-blue-500 stroke-slate-200 dark:fill-blue-400 dark:stroke-slate-700'
              }
              strokeWidth={point.isBest ? 3 : 2}
              data-testid="chart-point"
            >
              <title>
                {formatChartDate(point.source.date)}: {formatAxisValue(point.source.value)}{' '}
                {metricLabel}
                {point.isBest ? ', best in range' : ''}
              </title>
            </circle>
          </g>
        ))}

        <text
          x={firstPoint.x}
          y={dimensions.height - 8}
          textAnchor={geometry.points.length === 1 ? 'middle' : 'start'}
          className="fill-slate-500 text-[11px] dark:fill-slate-400"
        >
          {formatChartDate(firstPoint.source.date)}
        </text>
        {geometry.points.length > 1 && (
          <text
            x={lastPoint.x}
            y={dimensions.height - 8}
            textAnchor="end"
            className="fill-slate-500 text-[11px] dark:fill-slate-400"
          >
            {formatChartDate(lastPoint.source.date)}
          </text>
        )}
      </svg>
    </div>
  )
}

function formatAxisValue(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatChartDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
