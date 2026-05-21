// Database initialization utility
import { DatabaseManager } from './db';

/**
 * Initialize the database with schema and seed data
 * This function should be called once when the application starts
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing database...');
    
    // Get database instance (automatically runs migrations)
    DatabaseManager.getInstance();
    console.log('✅ Database schema initialized');
    
    // Run seeding (only seeds if data doesn't exist)
    await DatabaseManager.runSeeds();
    console.log('✅ Database seeding completed');
    
    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Reset the database (development only)
 * Clears all data and re-seeds
 */
export async function resetDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }
  
  try {
    console.log('🔄 Resetting database...');
    
    // Clear all data
    DatabaseManager.reset();
    console.log('✅ Database cleared');
    
    // Re-seed data
    await DatabaseManager.runSeeds();
    console.log('✅ Database re-seeded');
    
    console.log('🎉 Database reset complete!');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
}

/**
 * Check database health
 */
export function checkDatabaseHealth(): {
  connected: boolean;
  path: string | null;
  integrity: boolean;
} {
  try {
    const path = DatabaseManager.getPath();
    const integrity = DatabaseManager.checkIntegrity();
    
    return {
      connected: true,
      path,
      integrity
    };
  } catch (error) {
    return {
      connected: false,
      path: null,
      integrity: false
    };
  }
}

// Export commonly used query modules for convenience
export { 
  exerciseQueries, 
  categoryQueries,
  workoutQueries,
  workoutSetQueries,
  userQueries 
} from './queries';

export type {
  User,
  Exercise,
  ExerciseWithParsedFields,
  ExerciseCategory,
  WorkoutSession,
  WorkoutSessionWithSets,
  WorkoutSet,
  WorkoutWithDetails,
  ExerciseSearchParams,
  WorkoutSessionInput,
  WorkoutSetInput,
  CreateUserInput,
  UserPreferences,
  PaginatedResult
} from '../types/database';