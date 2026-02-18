import type { Exercise } from './database'

// Core Progress Data Types
export interface ProgressDataPoint {
  id: string
  date: string // ISO date string
  exerciseId: string
  exerciseName: string
  weight: number | null
  reps: number | null
  volume: number // weight * reps
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
  }
  trends: {
    weight: 'up' | 'down' | 'stable'
    reps: 'up' | 'down' | 'stable'
    volume: 'up' | 'down' | 'stable'
  }
  statistics: {
    totalWorkouts: number
    averageWeight: number | null
    averageReps: number | null
    totalVolume: number
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
  metric: 'weight' | 'reps' | 'volume'
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
  userId: string
  exerciseIds?: string[]
  startDate: string
  endDate: string
  metric?: 'weight' | 'reps' | 'volume'
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
}

export interface ChartConfig {
  type: 'line' | 'bar'
  showTrendLine: boolean
  highlightPRs: boolean
  metric: 'weight' | 'reps' | 'volume'
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
  selectedMetric: 'weight' | 'reps' | 'volume'
}

// Utility Types
export type TrendDirection = 'up' | 'down' | 'stable'

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