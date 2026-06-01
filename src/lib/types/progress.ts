import type { Exercise } from './database'

export type ProgressMetric = 'weight' | 'reps' | 'volume' | 'duration' | 'distance' | 'speed'
export type TrendDirection = 'up' | 'down' | 'stable'

// Core Progress Data Types
export interface ProgressDataPoint {
  id: string
  date: string // ISO date string
  exerciseId: string
  exerciseName: string
  weight: number | null
  reps: number | null
  volume: number // weight * reps
  durationSeconds: number | null
  distanceKm: number | null
  speedKmh: number | null
  incline: number | null
  isPersonalRecord: boolean
  sessionId: string
  setNumber: number
}

export interface ExerciseProgress {
  exerciseId: string
  exerciseName: string
  dataPoints: ProgressDataPoint[]
  personalRecords: {
    maxWeight: ProgressDataPoint | null
    maxReps: ProgressDataPoint | null
    maxVolume: ProgressDataPoint | null
    maxDuration: ProgressDataPoint | null
    maxDistance: ProgressDataPoint | null
    maxSpeed: ProgressDataPoint | null
  }
  trends: Record<ProgressMetric, TrendDirection>
  statistics: {
    totalWorkouts: number
    averageWeight: number | null
    averageReps: number | null
    totalVolume: number
    totalDurationSeconds: number
    totalDistanceKm: number
    averageSpeedKmh: number | null
    improvementPercentage: number
  }
}

// Filter and State Types
export interface ProgressFilters {
  exerciseIds: string[]
  dateRange: {
    start: string // ISO date string
    end: string // ISO date string
  }
  metric: ProgressMetric
}

export interface ProgressState {
  filters: ProgressFilters
  data: ExerciseProgress[]
  isLoading: boolean
  error: string | null
  selectedChart: 'line' | 'bar'
  showTrendLines: boolean
  highlightPRs: boolean
}

// API Request/Response Types
export interface ProgressRequest {
  exerciseIds?: string[]
  startDate: string
  endDate: string
  metric?: ProgressMetric
  limit?: number
}

export interface ProgressResponse {
  success: boolean
  data: {
    progress: ExerciseProgress[]
    totalExercises: number
    dateRange: {
      start: string
      end: string
    }
  }
  error?: string
}

// Chart-specific Types
export interface ChartDataPoint {
  date: string
  value: number
  exerciseName: string
  isPersonalRecord: boolean
  volume: number
  weight: number | null
  reps: number | null
  durationSeconds: number | null
  distanceKm: number | null
  speedKmh: number | null
}

export interface ChartConfig {
  type: 'line' | 'bar'
  showTrendLine: boolean
  highlightPRs: boolean
  metric: ProgressMetric
  colors: {
    primary: string
    secondary: string
    accent: string
    pr: string
  }
}

// Component Props Types
export interface ProgressDashboardProps {
  userId: string
  initialFilters?: Partial<ProgressFilters>
}

export interface ExerciseProgressChartProps {
  data: ExerciseProgress
  config: ChartConfig
  onDataPointClick?: (dataPoint: ProgressDataPoint) => void
}

export interface ProgressFiltersProps {
  filters: ProgressFilters
  exerciseOptions: Exercise[]
  onFiltersChange: (filters: Partial<ProgressFilters>) => void
  onReset: () => void
}

export interface ProgressStatsProps {
  data: ExerciseProgress[]
  selectedMetric: ProgressMetric
}

// Utility Types
export interface TrendCalculation {
  direction: TrendDirection
  percentage: number
  significance: 'high' | 'medium' | 'low'
}

export interface DatePreset {
  label: string
  value: string
  days: number
}

export const DATE_PRESETS: DatePreset[] = [
  { label: '7 Days', value: '7d', days: 7 },
  { label: '30 Days', value: '30d', days: 30 },
  { label: '90 Days', value: '90d', days: 90 },
  { label: '1 Year', value: '1y', days: 365 },
] as const
