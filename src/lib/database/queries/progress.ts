import type { Database } from 'better-sqlite3'
import type { 
  ProgressDataPoint, 
  ExerciseProgress, 
  ProgressRequest,
  TrendDirection
} from '../../types/progress'
import dayjs from 'dayjs'

export class ProgressQueries {
  constructor(private db: Database) {}

  /**
   * Get progress data for exercises within a date range
   */
  getProgressData(request: ProgressRequest): ExerciseProgress[] {
    const { userId, exerciseIds, startDate, endDate, limit = 1000 } = request

    // Base query to get workout sets with exercise details
    let query = `
      SELECT 
        ws.id,
        ws.workout_id as sessionId,
        ws.exercise_id as exerciseId,
        ws.set_number as setNumber,
        ws.weight,
        ws.reps,
        ws.created_at,
        e.name as exerciseName,
        wss.date
      FROM workout_sets ws
      JOIN exercises e ON ws.exercise_id = e.id
      JOIN workout_sessions wss ON ws.workout_id = wss.id
      WHERE wss.user_id = ? 
        AND wss.date >= ? 
        AND wss.date <= ?
    `

    const params: any[] = [userId, startDate, endDate]

    // Add exercise filter if specified
    if (exerciseIds && exerciseIds.length > 0) {
      const placeholders = exerciseIds.map(() => '?').join(',')
      query += ` AND ws.exercise_id IN (${placeholders})`
      params.push(...exerciseIds)
    }

    query += `
      ORDER BY wss.date ASC, ws.exercise_id, ws.set_number ASC
      LIMIT ?
    `
    params.push(limit)

    const stmt = this.db.prepare(query)
    const rows = stmt.all(...params) as any[]

    // Group data by exercise
    const exerciseData = new Map<string, ProgressDataPoint[]>()

    rows.forEach(row => {
      const dataPoint: ProgressDataPoint = {
        id: row.id,
        date: row.date,
        exerciseId: row.exerciseId,
        exerciseName: row.exerciseName,
        weight: row.weight,
        reps: row.reps,
        volume: (row.weight || 0) * (row.reps || 0),
        isPersonalRecord: false, // Will be calculated later
        sessionId: row.sessionId,
        setNumber: row.setNumber
      }

      if (!exerciseData.has(row.exerciseId)) {
        exerciseData.set(row.exerciseId, [])
      }
      exerciseData.get(row.exerciseId)!.push(dataPoint)
    })

    // Convert to ExerciseProgress format
    const results: ExerciseProgress[] = []
    
    exerciseData.forEach((dataPoints, exerciseId) => {
      const exerciseName = dataPoints[0]?.exerciseName || 'Unknown Exercise'
      
      // Calculate personal records and mark them
      const { markedDataPoints, personalRecords } = this.calculatePersonalRecords(dataPoints)
      
      // Calculate trends
      const trends = this.calculateTrends(markedDataPoints)
      
      // Calculate statistics
      const statistics = this.calculateStatistics(markedDataPoints)

      const exerciseProgress: ExerciseProgress = {
        exerciseId,
        exerciseName,
        dataPoints: markedDataPoints,
        personalRecords,
        trends,
        statistics
      }

      results.push(exerciseProgress)
    })

    return results
  }

  /**
   * Get available exercises for a user (exercises they've performed)
   */
  getUserExercises(userId: string): Array<{ id: string; name: string; category_name?: string }> {
    const query = `
      SELECT DISTINCT 
        e.id,
        e.name,
        ec.name as category_name
      FROM exercises e
      JOIN workout_sets ws ON e.id = ws.exercise_id
      JOIN workout_sessions wss ON ws.workout_id = wss.id
      LEFT JOIN exercise_categories ec ON e.category_id = ec.id  
      WHERE wss.user_id = ?
      ORDER BY e.name ASC
    `

    const stmt = this.db.prepare(query)
    return stmt.all(userId) as Array<{ id: string; name: string; category_name?: string }>
  }

  /**
   * Get date range for user's workout data
   */
  getUserWorkoutDateRange(userId: string): { earliest: string; latest: string } | null {
    const query = `
      SELECT 
        MIN(date) as earliest,
        MAX(date) as latest
      FROM workout_sessions 
      WHERE user_id = ?
    `

    const stmt = this.db.prepare(query)
    const result = stmt.get(userId) as { earliest: string; latest: string } | undefined

    return result || null
  }

  /**
   * Calculate and mark personal records in data points
   */
  private calculatePersonalRecords(dataPoints: ProgressDataPoint[]) {
    let maxWeight: ProgressDataPoint | null = null
    let maxReps: ProgressDataPoint | null = null
    let maxVolume: ProgressDataPoint | null = null

    // Sort by date to process chronologically
    const sortedPoints = [...dataPoints].sort((a, b) => 
      dayjs(a.date).isBefore(b.date) ? -1 : 1
    )

    const markedDataPoints = sortedPoints.map(point => {
      const updatedPoint = { ...point }

      // Check for weight PR
      if (point.weight && (!maxWeight || point.weight > (maxWeight.weight || 0))) {
        maxWeight = point
        updatedPoint.isPersonalRecord = true
      }

      // Check for reps PR (at same or higher weight)
      if (point.reps && point.weight && (
        !maxReps || 
        point.reps > (maxReps.reps || 0) ||
        (point.reps === maxReps.reps && point.weight > (maxReps.weight || 0))
      )) {
        maxReps = point
        updatedPoint.isPersonalRecord = true
      }

      // Check for volume PR
      if (point.volume > 0 && (!maxVolume || point.volume > maxVolume.volume)) {
        maxVolume = point
        updatedPoint.isPersonalRecord = true
      }

      return updatedPoint
    })

    return {
      markedDataPoints,
      personalRecords: {
        maxWeight,
        maxReps,
        maxVolume
      }
    }
  }

  /**
   * Calculate trends for weight, reps, and volume
   */
  private calculateTrends(dataPoints: ProgressDataPoint[]) {
    const calculateTrendForMetric = (
      values: number[], 
      threshold: number = 0.05
    ): TrendDirection => {
      if (values.length < 2) return 'stable'

      const firstHalf = values.slice(0, Math.floor(values.length / 2))
      const secondHalf = values.slice(Math.floor(values.length / 2))

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      const percentChange = (secondAvg - firstAvg) / firstAvg

      if (percentChange > threshold) return 'up'
      if (percentChange < -threshold) return 'down'
      return 'stable'
    }

    // Get values for each metric
    const weights = dataPoints.filter(p => p.weight).map(p => p.weight!)
    const reps = dataPoints.filter(p => p.reps).map(p => p.reps!)
    const volumes = dataPoints.filter(p => p.volume > 0).map(p => p.volume)

    return {
      weight: calculateTrendForMetric(weights),
      reps: calculateTrendForMetric(reps),
      volume: calculateTrendForMetric(volumes)
    }
  }

  /**
   * Calculate statistics for exercise progress
   */
  private calculateStatistics(dataPoints: ProgressDataPoint[]) {
    const workoutDates = new Set(dataPoints.map(p => p.date))
    const weights = dataPoints.filter(p => p.weight).map(p => p.weight!)
    const reps = dataPoints.filter(p => p.reps).map(p => p.reps!)
    const volumes = dataPoints.filter(p => p.volume > 0).map(p => p.volume)

    // Calculate improvement percentage (first vs last workout)
    let improvementPercentage = 0
    if (volumes.length >= 2) {
      const firstVolume = volumes[0]
      const lastVolume = volumes[volumes.length - 1]
      improvementPercentage = ((lastVolume - firstVolume) / firstVolume) * 100
    }

    return {
      totalWorkouts: workoutDates.size,
      averageWeight: weights.length > 0 
        ? weights.reduce((a, b) => a + b, 0) / weights.length 
        : null,
      averageReps: reps.length > 0 
        ? reps.reduce((a, b) => a + b, 0) / reps.length 
        : null,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
      improvementPercentage: Math.round(improvementPercentage * 100) / 100
    }
  }
}

// Export singleton instance
let progressQueries: ProgressQueries | null = null

export const getProgressQueries = (db: Database): ProgressQueries => {
  if (!progressQueries) {
    progressQueries = new ProgressQueries(db)
  }
  return progressQueries
}