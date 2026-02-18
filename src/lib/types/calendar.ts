export interface WorkoutCalendarData {
  date: string; // ISO date string
  hasWorkout: boolean;
  workoutCount: number;
  totalSets: number;
  totalVolume: number; // in kg
  exerciseCount: number;
  sessionIds: string[];
  intensity: 'light' | 'moderate' | 'intense';
  duration?: number; // in minutes
}

export interface CalendarDataRequest {
  userId: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  includeDetails?: boolean;
}

export interface CalendarDataResponse {
  success: boolean;
  data: WorkoutCalendarData[];
  summary: {
    totalWorkouts: number;
    totalVolume: number; // in kg
    averageWorkoutsPerWeek: number;
    longestStreak: number;
    currentStreak: number;
    lastWorkoutDate: string | null;
    workoutsThisMonth: number;
  };
  dateRange: {
    start: string;
    end: string;
  };
  error?: string;
}

export interface WorkoutDetailRequest {
  userId: string;
  date: string; // ISO date string
}

export interface WorkoutDetailResponse {
  success: boolean;
  data: WorkoutSessionWithSets[];
  error?: string;
}

export interface WorkoutSessionWithSets {
  id: string;
  userId: string;
  date: string;
  duration?: number;
  notes?: string;
  sets: WorkoutSet[];
  totalVolume: number;
  exerciseCount: number;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  restTime?: number;
  notes?: string;
  exerciseName?: string;
}

export interface CalendarState {
  // Date States
  currentDate: Date;
  selectedDate: Date | null;
  dateRange: {
    start: Date;
    end: Date;
  };
  
  // Data States
  workoutData: WorkoutCalendarData[];
  selectedWorkout: WorkoutSessionWithSets | null;
  isLoading: boolean;
  error: string | null;
  
  // UI States
  isModalOpen: boolean;
  calendarView: 'month' | 'rolling';
  
  // Stats States
  summaryStats: {
    totalWorkouts: number;
    totalVolume: number;
    averageWorkoutsPerWeek: number;
    longestStreak: number;
    currentStreak: number;
    lastWorkoutDate: string | null;
    workoutsThisMonth: number;
  };
}

// ilamy Calendar Event Interface
export interface WorkoutEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  data: {
    workoutCount: number;
    totalSets: number;
    totalVolume: number;
    exerciseCount: number;
    intensity: 'light' | 'moderate' | 'intense';
    sessionIds: string[];
    duration?: number;
  };
}

export interface CalendarActions {
  setCurrentDate: (date: Date) => void;
  selectDate: (date: Date | null) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  openWorkoutModal: (date: Date) => void;
  closeWorkoutModal: () => void;
  loadCalendarData: (dateRange: { start: Date; end: Date }) => Promise<void>;
  refreshData: () => Promise<void>;
}