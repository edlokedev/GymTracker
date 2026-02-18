import { db } from '../db';
import type { 
  WorkoutSession,
  WorkoutSet,
  WorkoutSessionWithSets,
  WorkoutWithDetails,
  PaginatedResult,
  WorkoutSessionInput,
  WorkoutSetInput
} from '../../types/database';

export const workoutQueries = {
  // Create a new workout session
  createSession: (data: WorkoutSessionInput): WorkoutSession => {
    const stmt = db.prepare(`
      INSERT INTO workout_sessions (
        id, user_id, name, date, notes, start_time, end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = generateId();
    const now = new Date().toISOString();
    
    stmt.run(
      id,
      data.user_id,
      data.name || null,
      data.date || new Date().toISOString().split('T')[0],
      data.notes || null,
      data.start_time || now,
      data.end_time || null
    );

    return getSession(id)!;
  },

  // Update a workout session
  updateSession: (id: string, data: Partial<WorkoutSessionInput>): WorkoutSession | null => {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.date !== undefined) {
      fields.push('date = ?');
      values.push(data.date);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }
    if (data.start_time !== undefined) {
      fields.push('start_time = ?');
      values.push(data.start_time);
    }
    if (data.end_time !== undefined) {
      fields.push('end_time = ?');
      values.push(data.end_time);
    }

    if (fields.length === 0) {
      return getSession(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE workout_sessions 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0 ? getSession(id) : null;
  },

  // Delete a workout session
  deleteSession: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM workout_sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Complete a workout session
  completeSession: (id: string): WorkoutSession | null => {
    const stmt = db.prepare(`
      UPDATE workout_sessions 
      SET end_time = ?, updated_at = ?
      WHERE id = ? AND end_time IS NULL
    `);

    const now = new Date().toISOString();
    const result = stmt.run(now, now, id);
    return result.changes > 0 ? getSession(id) : null;
  },

  // Get workout session by ID
  getSession: (id: string): WorkoutSession | null => {
    return getSession(id);
  },

  // Get workout session with all sets
  getSessionWithSets: (id: string): WorkoutSessionWithSets | null => {
    const session = getSession(id);
    if (!session) return null;

    const sets = workoutSetQueries.getByWorkoutId(id);
    const totalVolume = sets.reduce((sum, set) => 
      sum + ((set.weight || 0) * (set.reps || 0)), 0
    );
    
    return {
      ...session,
      sets,
      total_sets: sets.length,
      total_volume: totalVolume
    };
  },

  // Get user's workout sessions with pagination
  getUserSessions: (
    userId: string, 
    limit: number = 20, 
    offset: number = 0
  ): PaginatedResult<WorkoutSession> => {
    // Count total sessions
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total 
      FROM workout_sessions 
      WHERE user_id = ?
    `);
    const { total } = countStmt.get(userId) as { total: number };

    // Get sessions
    const stmt = db.prepare(`
      SELECT * FROM workout_sessions 
      WHERE user_id = ?
      ORDER BY date DESC, start_time DESC
      LIMIT ? OFFSET ?
    `);

    const sessions = stmt.all(userId, limit, offset) as WorkoutSession[];

    return {
      data: sessions.map(parseSessionDates),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total
    };
  },

  // Get user's recent workout sessions
  getRecentSessions: (userId: string, limit: number = 10): WorkoutSession[] => {
    const stmt = db.prepare(`
      SELECT * FROM workout_sessions 
      WHERE user_id = ?
      ORDER BY date DESC, start_time DESC
      LIMIT ?
    `);

    const sessions = stmt.all(userId, limit) as WorkoutSession[];
    return sessions.map(parseSessionDates);
  },

  // Get workout sessions by date range
  getSessionsByDateRange: (
    userId: string, 
    startDate: string, 
    endDate: string
  ): WorkoutSession[] => {
    const stmt = db.prepare(`
      SELECT * FROM workout_sessions 
      WHERE user_id = ? AND date BETWEEN ? AND ?
      ORDER BY date DESC, start_time DESC
    `);

    const sessions = stmt.all(userId, startDate, endDate) as WorkoutSession[];
    return sessions.map(parseSessionDates);
  },

  // Get workout session with full details (including exercises)
  getSessionWithDetails: (id: string): WorkoutWithDetails | null => {
    const session = getSession(id);
    if (!session) return null;

    const stmt = db.prepare(`
      SELECT 
        ws.*,
        e.id as exercise_id,
        e.name as exercise_name,
        e.primary_muscles,
        e.equipment,
        ec.name as category_name
      FROM workout_sets ws
      JOIN exercises e ON ws.exercise_id = e.id
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE ws.workout_id = ?
      ORDER BY ws.set_number, ws.created_at
    `);

    const sets = stmt.all(id) as any[];
    
    // Group sets by exercise
    const exerciseMap = new Map();
    sets.forEach(set => {
      const exerciseId = set.exercise_id;
      if (!exerciseMap.has(exerciseId)) {
        exerciseMap.set(exerciseId, {
          exercise: {
            id: exerciseId,
            name: set.exercise_name,
            primary_muscles: JSON.parse(set.primary_muscles || '[]'),
            equipment: set.equipment,
            category_name: set.category_name
          },
          sets: []
        });
      }
      
      exerciseMap.get(exerciseId).sets.push({
        id: set.id,
        workout_id: set.workout_id,
        exercise_id: set.exercise_id,
        set_number: set.set_number,
        reps: set.reps,
        weight: set.weight,
        rest_time: set.rest_time,
        notes: set.notes,
        created_at: new Date(set.created_at),
        updated_at: new Date(set.updated_at)
      });
    });

    return {
      ...session,
      exercises: Array.from(exerciseMap.values())
    };
  },

  // Get workout statistics for user
  getUserStats: (userId: string, days: number = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN end_time IS NOT NULL THEN 1 END) as completed_sessions,
        AVG(
          CASE 
            WHEN end_time IS NOT NULL AND start_time IS NOT NULL 
            THEN (julianday(end_time) - julianday(start_time)) * 24 * 60
          END
        ) as avg_duration_minutes
      FROM workout_sessions 
      WHERE user_id = ? AND date >= ?
    `);

    return stmt.get(userId, cutoffDateStr);
  }
};

// Workout set queries
export const workoutSetQueries = {
  // Create a new workout set
  createSet: (data: WorkoutSetInput): WorkoutSet => {
    const stmt = db.prepare(`
      INSERT INTO workout_sets (
        id, workout_id, exercise_id, set_number, reps, weight, 
        rest_time, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = generateId();
    
    stmt.run(
      id,
      data.workout_id,
      data.exercise_id,
      data.set_order, // maps to set_number
      data.reps || null,
      data.weight || null,
      data.rest_time || null,
      data.notes || null
    );

    return getSet(id)!;
  },

  // Update a workout set
  updateSet: (id: string, data: Partial<WorkoutSetInput>): WorkoutSet | null => {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (data.set_order !== undefined) {
      fields.push('set_number = ?');
      values.push(data.set_order);
    }
    if (data.reps !== undefined) {
      fields.push('reps = ?');
      values.push(data.reps);
    }
    if (data.weight !== undefined) {
      fields.push('weight = ?');
      values.push(data.weight);
    }
    if (data.rest_time !== undefined) {
      fields.push('rest_time = ?');
      values.push(data.rest_time);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return getSet(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE workout_sets 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0 ? getSet(id) : null;
  },

  // Delete a workout set
  deleteSet: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM workout_sets WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Get workout set by ID
  getSet: (id: string): WorkoutSet | null => {
    return getSet(id);
  },

  // Get all sets for a workout
  getByWorkoutId: (workoutId: string): WorkoutSet[] => {
    const stmt = db.prepare(`
      SELECT * FROM workout_sets 
      WHERE workout_id = ?
      ORDER BY set_number, created_at
    `);

    const sets = stmt.all(workoutId) as WorkoutSet[];
    return sets.map(parseSetDates);
  },

  // Get all sets for an exercise in a workout
  getByExerciseInWorkout: (workoutId: string, exerciseId: string): WorkoutSet[] => {
    const stmt = db.prepare(`
      SELECT * FROM workout_sets 
      WHERE workout_id = ? AND exercise_id = ?
      ORDER BY set_number, created_at
    `);

    const sets = stmt.all(workoutId, exerciseId) as WorkoutSet[];
    return sets.map(parseSetDates);
  },

  // Get user's history for a specific exercise
  getExerciseHistory: (
    userId: string, 
    exerciseId: string, 
    limit: number = 50
  ): WorkoutSet[] => {
    const stmt = db.prepare(`
      SELECT ws.* 
      FROM workout_sets ws
      JOIN workout_sessions session ON ws.workout_id = session.id
      WHERE session.user_id = ? AND ws.exercise_id = ?
      ORDER BY session.date DESC, ws.set_number
      LIMIT ?
    `);

    const sets = stmt.all(userId, exerciseId, limit) as WorkoutSet[];
    return sets.map(parseSetDates);
  },

  // Get personal records for an exercise
  getPersonalRecords: (userId: string, exerciseId: string) => {
    const stmt = db.prepare(`
      SELECT 
        MAX(weight) as max_weight,
        MAX(reps) as max_reps,
        MAX(weight * reps) as max_volume
      FROM workout_sets ws
      JOIN workout_sessions session ON ws.workout_id = session.id
      WHERE session.user_id = ? AND ws.exercise_id = ?
    `);

    return stmt.get(userId, exerciseId);
  }
};

// Helper functions
function getSession(id: string): WorkoutSession | null {
  const stmt = db.prepare('SELECT * FROM workout_sessions WHERE id = ?');
  const session = stmt.get(id) as WorkoutSession | undefined;
  return session ? parseSessionDates(session) : null;
}

function getSet(id: string): WorkoutSet | null {
  const stmt = db.prepare('SELECT * FROM workout_sets WHERE id = ?');
  const set = stmt.get(id) as WorkoutSet | undefined;
  return set ? parseSetDates(set) : null;
}

function parseSessionDates(session: WorkoutSession): WorkoutSession {
  return {
    ...session,
    created_at: new Date(session.created_at),
    updated_at: new Date(session.updated_at),
    start_time: new Date(session.start_time).toISOString(),
    end_time: session.end_time ? new Date(session.end_time).toISOString() : undefined
  };
}

function parseSetDates(set: WorkoutSet): WorkoutSet {
  return {
    ...set,
    created_at: new Date(set.created_at),
    updated_at: new Date(set.updated_at)
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}