import { useMemo } from 'react'
import type { ChartDataPoint } from '@/lib/types/progress'
import { formatExerciseName } from '@/lib/utils/text'

const CHART_WIDTH = 800
const CHART_HEIGHT = 320
const PAD_LEFT = 48
const PAD_RIGHT = 16
const PAD_TOP = 16
const PAD_BOTTOM = 32

const SERIES_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
  '#06b6d4', // cyan-500
]

interface Series {
  name: string
  color: string
  points: Array<{ x: number; y: number; isPersonalRecord: boolean }>
}

export interface ProgressChartProps {
  points: ChartDataPoint[]
  chartType: 'line' | 'bar'
  showTrendLines: boolean
  highlightPRs: boolean
  metricLabel: string
}

export function buildSeries(points: ChartDataPoint[]): Series[] {
  const byExercise = new Map<string, ChartDataPoint[]>()
  for (const point of points) {
    if (!Number.isFinite(point.value)) continue
    const list = byExercise.get(point.exerciseName) ?? []
    list.push(point)
    byExercise.set(point.exerciseName, list)
  }

  const dates = [...byExercise.values()].flat().map((p) => Date.parse(p.date))
  const maxValue = Math.max(...[...byExercise.values()].flat().map((p) => p.value), 0)
  const minDate = Math.min(...dates)
  const maxDate = Math.max(...dates)
  const dateSpan = Math.max(maxDate - minDate, 1)
  const valueSpan = maxValue > 0 ? maxValue : 1

  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM

  return [...byExercise.entries()].map(([name, exercisePoints], index) => ({
    name,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
    points: exercisePoints.map((point) => ({
      x: PAD_LEFT + ((Date.parse(point.date) - minDate) / dateSpan) * plotWidth,
      y: PAD_TOP + plotHeight - (point.value / valueSpan) * plotHeight,
      isPersonalRecord: point.isPersonalRecord,
    })),
  }))
}

export function linearTrend(
  points: Array<{ x: number; y: number }>,
): { x1: number; y1: number; x2: number; y2: number } | null {
  if (points.length < 2) return null
  const n = points.length
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n
  const denominator = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0)
  if (denominator === 0) return null
  const slope = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) / denominator
  const intercept = meanY - slope * meanX
  const xs = points.map((p) => p.x)
  const x1 = Math.min(...xs)
  const x2 = Math.max(...xs)
  return { x1, y1: slope * x1 + intercept, x2, y2: slope * x2 + intercept }
}

export function ProgressChart({
  points,
  chartType,
  showTrendLines,
  highlightPRs,
  metricLabel,
}: ProgressChartProps) {
  const series = useMemo(() => buildSeries(points), [points])
  const maxValue = useMemo(
    () => Math.max(...points.map((p) => p.value).filter(Number.isFinite), 0),
    [points],
  )

  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        No data points for this metric in the selected period.
      </p>
    )
  }

  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const firstDate = points[0]?.date
  const lastDate = points[points.length - 1]?.date
  const barWidth = Math.max(
    2,
    Math.min(16, (CHART_WIDTH - PAD_LEFT - PAD_RIGHT) / (points.length * 2)),
  )

  return (
    <div>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${chartType === 'line' ? 'Line' : 'Bar'} chart of ${metricLabel} over time`}
      >
        {gridLines.map((fraction) => {
          const y = PAD_TOP + plotHeight - fraction * plotHeight
          return (
            <g key={fraction}>
              <line
                x1={PAD_LEFT}
                x2={CHART_WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                className="stroke-gray-200 dark:stroke-gray-700"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-500 text-[11px] dark:fill-gray-400"
              >
                {formatAxisValue(maxValue * fraction)}
              </text>
            </g>
          )
        })}

        {series.map((s) => (
          <g key={s.name}>
            {chartType === 'line' && s.points.length > 1 && (
              <polyline
                data-testid={`series-line-${s.name}`}
                points={s.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {chartType === 'bar' &&
              s.points.map((p, i) => (
                <rect
                  key={i}
                  data-testid={`series-bar-${s.name}`}
                  x={p.x - barWidth / 2}
                  y={p.y}
                  width={barWidth}
                  height={Math.max(PAD_TOP + plotHeight - p.y, 1)}
                  fill={s.color}
                  fillOpacity={0.85}
                  rx={1.5}
                />
              ))}

            {chartType === 'line' &&
              s.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={highlightPRs && p.isPersonalRecord ? 5 : 3}
                  fill={s.color}
                  stroke={highlightPRs && p.isPersonalRecord ? '#f59e0b' : 'transparent'}
                  strokeWidth={highlightPRs && p.isPersonalRecord ? 2.5 : 0}
                  data-testid={highlightPRs && p.isPersonalRecord ? 'pr-point' : undefined}
                />
              ))}

            {showTrendLines &&
              (() => {
                const trend = linearTrend(s.points)
                return trend ? (
                  <line
                    data-testid={`trend-line-${s.name}`}
                    x1={trend.x1}
                    y1={trend.y1}
                    x2={trend.x2}
                    y2={trend.y2}
                    stroke={s.color}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    strokeOpacity={0.6}
                  />
                ) : null
              })()}
          </g>
        ))}

        {firstDate && (
          <text
            x={PAD_LEFT}
            y={CHART_HEIGHT - 8}
            textAnchor="start"
            className="fill-gray-500 text-[11px] dark:fill-gray-400"
          >
            {firstDate}
          </text>
        )}
        {lastDate && lastDate !== firstDate && (
          <text
            x={CHART_WIDTH - PAD_RIGHT}
            y={CHART_HEIGHT - 8}
            textAnchor="end"
            className="fill-gray-500 text-[11px] dark:fill-gray-400"
          >
            {lastDate}
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center gap-1.5 text-gray-600 text-xs dark:text-gray-300"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {formatExerciseName(s.name)}
          </span>
        ))}
      </div>
    </div>
  )
}

function formatAxisValue(value: number): string {
  if (value >= 1000)
    return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}k`
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}
