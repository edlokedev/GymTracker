-- GymTracker Database Schema
-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Enable WAL mode for better concurrent access
PRAGMA journal_mode = WAL;

-- Set synchronous mode for better performance
PRAGMA synchronous = NORMAL;

-- Set cache size (in KB)
PRAGMA cache_size = 10000;

-- Users table (modified for OAuth with better-auth compatible naming)
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password TEXT, -- Optional for OAuth users (better-auth expects 'password' not 'passwordHash')
  name TEXT, -- Full name from OAuth provider
  image TEXT, -- Profile image from OAuth provider
  email_verified INTEGER DEFAULT 0, -- better-auth expects snake_case and INTEGER for boolean
  weightUnit TEXT DEFAULT 'lbs' CHECK(weightUnit IN ('lbs', 'kg')),
  theme TEXT DEFAULT 'dark' CHECK(theme IN ('light', 'dark')),
  created_at DATE DEFAULT (datetime('now')), -- better-auth expects DATE type and snake_case
  updated_at DATE DEFAULT (datetime('now')) -- better-auth expects DATE type and snake_case
);

-- Better-auth session table
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  expiresAt DATE NOT NULL, -- better-auth expects DATE type
  token TEXT NOT NULL UNIQUE,
  createdAt DATE DEFAULT (datetime('now')), -- better-auth expects DATE type
  updatedAt DATE DEFAULT (datetime('now')), -- better-auth expects DATE type
  ipAddress TEXT,
  userAgent TEXT,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

-- Better-auth accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL, -- This field was missing and required by better-auth
  provider TEXT, -- Remove NOT NULL constraint as better-auth might not always provide this
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt DATE, -- better-auth expects DATE type
  refreshTokenExpiresAt DATE, -- better-auth expects DATE type
  scope TEXT,
  password TEXT, -- For email/password accounts
  createdAt DATE DEFAULT (datetime('now')), -- better-auth expects DATE type
  updatedAt DATE DEFAULT (datetime('now')), -- better-auth expects DATE type
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE,
  UNIQUE(providerId, accountId)
);

-- Better-auth verification table
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATE NOT NULL, -- better-auth expects DATE type
  createdAt DATE DEFAULT (datetime('now')), -- better-auth expects DATE type
  updatedAt DATE DEFAULT (datetime('now')) -- better-auth expects DATE type
);

-- Exercise categories
CREATE TABLE IF NOT EXISTS exercise_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table with comprehensive metadata from Free Exercise DB
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY, -- Using original exercise ID from Free Exercise DB
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  force TEXT, -- push, pull, static, null
  level TEXT, -- beginner, intermediate, advanced, expert
  mechanic TEXT, -- compound, isolation, null
  equipment TEXT, -- barbell, dumbbell, cable, machine, body only, kettlebells, etc.
  primary_muscles TEXT NOT NULL, -- JSON array of primary muscle groups
  secondary_muscles TEXT, -- JSON array of secondary muscle groups
  instructions TEXT, -- JSON array of step-by-step instructions
  images TEXT, -- JSON array of image paths
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES exercise_categories(id) ON DELETE CASCADE
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT,
  date DATE NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Workout sets
CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight REAL CHECK(weight IS NULL OR weight >= 0), -- Allow NULL for bodyweight exercises
  reps INTEGER CHECK(reps IS NULL OR (reps > 0 AND reps <= 100)), -- Allow NULL but validate if provided
  rest_time INTEGER, -- seconds
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workout_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
  UNIQUE(workout_id, exercise_id, set_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise_id ON workout_sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date);
CREATE INDEX IF NOT EXISTS idx_exercises_category_id ON exercises(category_id);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_level ON exercises(level);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises(equipment);
CREATE INDEX IF NOT EXISTS idx_exercises_force ON exercises(force);
CREATE INDEX IF NOT EXISTS idx_exercises_mechanic ON exercises(mechanic);

-- OAuth session indexes
CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_session_expiresAt ON session(expiresAt);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_provider_accountId ON account(provider, accountId);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_expires_at ON verification(expiresAt);

-- Triggers for updated_at timestamps
CREATE TRIGGER IF NOT EXISTS update_user_updatedAt 
  AFTER UPDATE ON user 
  BEGIN 
    UPDATE user SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_exercises_updated_at 
  AFTER UPDATE ON exercises 
  BEGIN 
    UPDATE exercises SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_workout_sessions_updated_at 
  AFTER UPDATE ON workout_sessions 
  BEGIN 
    UPDATE workout_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_workout_sets_updated_at 
  AFTER UPDATE ON workout_sets 
  BEGIN 
    UPDATE workout_sets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

-- OAuth table triggers
CREATE TRIGGER IF NOT EXISTS update_session_updatedAt 
  AFTER UPDATE ON session 
  BEGIN 
    UPDATE session SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_account_updatedAt 
  AFTER UPDATE ON account 
  BEGIN 
    UPDATE account SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_verification_updated_at 
  AFTER UPDATE ON verification 
  BEGIN 
    UPDATE verification SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;