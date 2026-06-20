import { useEffect, useState } from 'react'
import { parseCalendarDate } from '@/lib/utils/calendar'

export interface ExerciseHistoryProps {
  exerciseId: string
  limit?: number
}

interface HistoricalSet {
  id: string
  set_number: number
  reps: number
  weight: number
  duration_seconds?: number
  distance_km?: number
  incline?: number
  speed_kmh?: number
  session_date: string
  session_name: string | null
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes === 0) return `${remainingSeconds}s`
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

function formatHistoricalSet(set: HistoricalSet): string {
  if (set.duration_seconds !== undefined) {
    const parts = [formatDuration(set.duration_seconds)]
    if (set.distance_km !== undefined) parts.push(`${set.distance_km} km`)
    if (set.incline !== undefined) parts.push(`incline ${set.incline}`)
    if (set.speed_kmh !== undefined) parts.push(`${set.speed_kmh} km/h`)
    return parts.join(', ')
  }

  return `${set.weight}kg x ${set.reps}`
}

export function ExerciseHistory({ exerciseId, limit = 50 }: ExerciseHistoryProps) {
  const [history, setHistory] = useState<HistoricalSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/workout-sets?action=history&exerciseId=${encodeURIComponent(exerciseId)}&limit=${limit}`,
        )
        if (res.ok) {
          const json = await res.json()
          if (json.success && active) {
            setHistory(json.data)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (active) setLoading(false)
      }
    }

    if (exerciseId) {
      load()
    }

    return () => {
      active = false
    }
  }, [exerciseId, limit])

  if (loading) {
    return (
      <div className="animate-pulse text-sm text-gray-500 py-2">Loading performance history...</div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        No progressive overload history found for this exercise.
      </div>
    )
  }

  // Group by date securely
  const grouped = history.reduce(
    (acc, set) => {
      if (!acc[set.session_date]) {
        acc[set.session_date] = []
      }
      acc[set.session_date].push(set)
      return acc
    },
    {} as Record<string, HistoricalSet[]>,
  )

  const sessionGroups = Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, sets]) => [date, [...sets].sort((a, b) => a.set_number - b.set_number)] as const)

  const formatDate = (dateStr: string) => {
    return parseCalendarDate(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-3 mt-2">
      {sessionGroups.map(([date, sets]) => (
        <div
          key={date}
          className="bg-gray-50 dark:bg-gray-800/80 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {formatDate(date)}
            </span>
            {sets[0].session_name && (
              <span className="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[120px]">
                {sets[0].session_name}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sets.map((s) => (
              <div
                key={s.id}
                className="text-xs font-medium bg-white dark:bg-gray-700 px-2 py-1.5 rounded shadow-sm flex justify-between"
              >
                <span className="text-gray-500 dark:text-gray-400">Set {s.set_number}</span>
                <span className="text-gray-900 dark:text-gray-200">{formatHistoricalSet(s)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
