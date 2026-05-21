import { useEffect, useState } from 'react'

export interface ExerciseHistoryProps {
  userId: string
  exerciseId: string
  limit?: number
}

interface HistoricalSet {
  id: string
  reps: number
  weight: number
  session_date: string
  session_name: string | null
}

export function ExerciseHistory({ userId, exerciseId, limit = 50 }: ExerciseHistoryProps) {
  const [history, setHistory] = useState<HistoricalSet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const res = await fetch(
          `/api/workout-sets?action=history&userId=${encodeURIComponent(userId)}&exerciseId=${encodeURIComponent(exerciseId)}&limit=${limit}`,
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

    if (userId && exerciseId) {
      load()
    }

    return () => {
      active = false
    }
  }, [userId, exerciseId, limit])

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-3 mt-2">
      {Object.entries(grouped).map(([date, sets]) => (
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
            {sets.map((s, idx) => (
              <div
                key={s.id}
                className="text-xs font-medium bg-white dark:bg-gray-700 px-2 py-1.5 rounded shadow-sm flex justify-between"
              >
                <span className="text-gray-500 dark:text-gray-400">Set {idx + 1}</span>
                <span className="text-gray-900 dark:text-gray-200">
                  {s.weight}kg × {s.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
