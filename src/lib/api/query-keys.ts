// Single source of truth for TanStack Query cache keys (ADR-0007).
//
// Rule: query keys are built ONLY through these exported factories, never as
// inline arrays at call sites. Invalidation then cannot typo-miss — an
// `invalidateQueries({ queryKey: queryKeys.calendar.all })` provably covers
// every calendar query because they all descend from the same factory.
//
// Convention: each domain exposes an `all` root key plus one factory per query
// shape. Keys are hierarchical arrays so partial keys invalidate whole subtrees
// (TanStack matches by prefix): invalidating `['calendar']` clears every
// calendar query, `['calendar','data']` clears only the range queries, etc.

/** Filters accepted by the paginated workout-sessions list. */
export interface WorkoutSessionListFilters {
  limit?: number
  offset?: number
  locationName?: string
}

/** Filters accepted by the exercise catalog search. */
export interface ExerciseSearchFilters {
  query?: string
  muscleGroups?: readonly string[]
  categories?: readonly string[]
  equipment?: readonly string[]
  favouritesOnly?: boolean
}

/** Params accepted by the progress analytics endpoint. */
export interface ProgressParams {
  exerciseId?: string
  from?: string
  to?: string
}

export const queryKeys = {
  calendar: {
    all: ['calendar'] as const,
    /** Rolling-window calendar summary for a given month/anchor date. */
    data: (month: string) => ['calendar', 'data', { month }] as const,
    /** Day drill-down (WorkoutDetailModal). */
    day: (date: string) => ['calendar', 'day', date] as const,
  },

  workoutSessions: {
    all: ['workout-sessions'] as const,
    list: (filters: WorkoutSessionListFilters = {}) =>
      ['workout-sessions', 'list', filters] as const,
    detail: (sessionId: string) => ['workout-sessions', 'detail', sessionId] as const,
  },

  workoutSets: {
    all: ['workout-sets'] as const,
    history: (exerciseId: string) => ['workout-sets', 'history', exerciseId] as const,
  },

  exercises: {
    all: ['exercises'] as const,
    search: (filters: ExerciseSearchFilters = {}) => ['exercises', 'search', filters] as const,
    facets: () => ['exercises', 'facets'] as const,
    favourites: () => ['exercises', 'favourites'] as const,
    recent: () => ['exercises', 'recent'] as const,
    suggestions: () => ['exercises', 'suggestions'] as const,
  },

  workoutTemplates: {
    all: ['workout-templates'] as const,
    list: () => ['workout-templates', 'list'] as const,
    detail: (id: string) => ['workout-templates', 'detail', id] as const,
  },

  progress: {
    all: ['progress'] as const,
    data: (params: ProgressParams = {}) => ['progress', params] as const,
  },

  locations: {
    all: ['workout-locations'] as const,
    list: () => ['workout-locations'] as const,
  },
} as const
