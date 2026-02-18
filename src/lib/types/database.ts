// Database entity types
export interface User {
  id: string;
  username?: string; // Optional for OAuth users
  email: string;
  password_hash?: string; // Optional for OAuth users
  name?: string; // Full name from OAuth provider
  image?: string; // Profile image from OAuth provider
  email_verified: boolean;
  theme: 'light' | 'dark';
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: Date;
  token: string;
  created_at: Date;
  updated_at: Date;
  ip_address?: string;
  user_agent?: string;
}

export interface Account {
  id: string;
  user_id: string;
  account_id: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  access_token_expires_at?: Date;
  refresh_token_expires_at?: Date;
  scope?: string;
  password?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Verification {
  id: string;
  identifier: string;
  value: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ExerciseCategory {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
}

export interface Exercise {
  id: string;
  name: string;
  category_id: string;
  force?: 'push' | 'pull' | 'static' | null;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  mechanic?: 'compound' | 'isolation' | null;
  equipment?: string;
  primary_muscles: string; // JSON array as string
  secondary_muscles?: string; // JSON array as string
  instructions?: string; // JSON array as string
  images?: string; // JSON array as string
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  name?: string;
  date: string; // ISO date string (YYYY-MM-DD)
  start_time: string; // ISO datetime string
  end_time?: string; // ISO datetime string
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkoutSet {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight?: number;
  reps?: number;
  rest_time?: number; // seconds
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// API/Application types (with parsed JSON fields)
export interface ExerciseWithParsedFields extends Omit<Exercise, 'primary_muscles' | 'secondary_muscles' | 'instructions' | 'images'> {
  primary_muscles: string[];
  secondary_muscles: string[];
  instructions: string[];
  images: string[];
  category_name?: string; // Joined from category table
}

export interface WorkoutSessionWithSets extends WorkoutSession {
  sets: WorkoutSet[];
  total_sets: number;
  total_volume: number; // weight * reps summed
  duration_minutes?: number;
}

export interface WorkoutWithDetails extends WorkoutSession {
  exercises: {
    exercise: {
      id: string;
      name: string;
      primary_muscles: string[];
      equipment: string;
      category_name: string;
    };
    sets: WorkoutSet[];
  }[];
}

export interface UserPreferences {
  theme: 'light' | 'dark';
}

// Form/Input types
export interface CreateUserInput {
  username?: string; // Optional for OAuth users
  email: string;
  password?: string; // Optional for OAuth users
  name?: string; // Full name from OAuth provider
  image?: string; // Profile image from OAuth provider
  email_verified?: boolean;
  theme?: 'light' | 'dark';
}

export interface WorkoutSessionInput {
  user_id: string;
  name?: string;
  date?: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
}

export interface WorkoutSetInput {
  workout_id: string;
  exercise_id: string;
  set_order: number; // maps to set_number in database
  reps?: number;
  weight?: number; // weight in kg
  rest_time?: number;
  notes?: string;
}

export interface CreateWorkoutInput {
  user_id: string;
  name?: string;
  date?: string;
  notes?: string;
}

export interface CreateSetInput {
  workout_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  rest_time?: number;
  notes?: string;
}

export interface UpdateSetInput {
  weight?: number;
  reps?: number;
  rest_time?: number;
  notes?: string;
}

// Search/Filter types
export interface ExerciseSearchParams {
  query?: string;
  category_id?: string;
  equipment?: string;
  level?: string;
  primary_muscle?: string;
  muscle_group?: string;
  force?: string;
  limit?: number;
  offset?: number;
}

export interface WorkoutSearchParams {
  user_id: string;
  date_from?: string;
  date_to?: string;
  exercise_id?: string;
  limit?: number;
  offset?: number;
}

// Database operation result types
export interface DatabaseResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Exercise data seeding types (from Free Exercise DB)
export interface FreeExerciseDBExercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// Migration types
export interface Migration {
  name: string;
  up: (db: import('better-sqlite3').Database) => Promise<void> | void;
  down: (db: import('better-sqlite3').Database) => Promise<void> | void;
}

// Error types
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public operation?: string
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}