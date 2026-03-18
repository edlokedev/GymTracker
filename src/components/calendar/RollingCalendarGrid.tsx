import { useMemo } from 'react'
import dayjs from 'dayjs'
import type { WorkoutCalendarData } from '../../lib/types/calendar'

interface RollingCalendarGridProps {
    workoutData: WorkoutCalendarData[]
    dateRange: { start: Date; end: Date }
    onDayClick: (date: Date) => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const INTENSITY_STYLES: Record<string, { gradient: string; label: string }> = {
    light: {
        gradient: 'linear-gradient(135deg, var(--color-info) 0%, var(--color-brand) 100%)',
        label: 'Light'
    },
    moderate: {
        gradient: 'linear-gradient(135deg, var(--color-warning) 0%, #ea580c 100%)',
        label: 'Moderate'
    },
    intense: {
        gradient: 'linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%)',
        label: 'Intense'
    }
}

export const RollingCalendarGrid: React.FC<RollingCalendarGridProps> = ({
    workoutData,
    dateRange,
    onDayClick
}) => {
    // Build a lookup map: "YYYY-MM-DD" -> WorkoutCalendarData
    const workoutMap = useMemo(() => {
        const map = new Map<string, WorkoutCalendarData>()
        for (const day of workoutData) {
            map.set(dayjs(day.date).format('YYYY-MM-DD'), day)
        }
        return map
    }, [workoutData])

    // Generate the list of days to render
    const days = useMemo(() => {
        const result: dayjs.Dayjs[] = []
        let current = dayjs(dateRange.start).startOf('day')
        const end = dayjs(dateRange.end).startOf('day')

        while (current.isBefore(end) || current.isSame(end, 'day')) {
            result.push(current)
            current = current.add(1, 'day')
        }
        return result
    }, [dateRange])

    // Number of empty padding cells before the first day (to align weekday columns)
    const leadingBlanks = days.length > 0 ? days[0].day() : 0

    const today = dayjs().startOf('day')

    return (
        <div className="rolling-calendar-grid">
            {/* Weekday Header */}
            <div className="rcg-header">
                {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="rcg-header-cell">
                        {label}
                    </div>
                ))}
            </div>

            {/* Day Cells Grid */}
            <div className="rcg-body">
                {/* Leading blank cells */}
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} className="rcg-cell rcg-cell-blank" />
                ))}

                {/* Actual day cells */}
                {days.map((day) => {
                    const key = day.format('YYYY-MM-DD')
                    const workout = workoutMap.get(key)
                    const isToday = day.isSame(today, 'day')
                    const hasWorkout = workout?.hasWorkout ?? false
                    const isNewMonth = day.date() === 1

                    const cellClasses = [
                        'rcg-cell',
                        isToday && 'rcg-cell-today',
                        hasWorkout && 'rcg-cell-workout'
                    ].filter(Boolean).join(' ')

                    return (
                        <button
                            key={key}
                            className={cellClasses}
                            onClick={() => hasWorkout && onDayClick(day.toDate())}
                            disabled={!hasWorkout}
                            type="button"
                            aria-label={`${day.format('MMMM D, YYYY')}${hasWorkout ? ' — has workout' : ''}`}
                        >
                            {/* Day number + month label */}
                            <span className="rcg-day-number">
                                {isNewMonth || day.isSame(days[0], 'day')
                                    ? day.format('D MMM')
                                    : day.format('D')}
                            </span>

                            {/* Workout indicator */}
                            {hasWorkout && workout && (
                                <div className="rcg-workout-indicator">
                                    <span
                                        className="rcg-intensity-dot"
                                        style={{ background: INTENSITY_STYLES[workout.intensity]?.gradient }}
                                        title={`${INTENSITY_STYLES[workout.intensity]?.label} — ${workout.workoutCount} workout${workout.workoutCount > 1 ? 's' : ''}`}
                                    />
                                    <span className="rcg-workout-count">
                                        {workout.workoutCount}
                                    </span>
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
