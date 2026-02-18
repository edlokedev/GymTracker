import { db } from '../db';
import type { 
  ExerciseSearchParams, 
  ExerciseWithParsedFields, 
  PaginatedResult
} from '../../types/database';

export const exerciseQueries = {
  // Get all exercises with category information
  getAll: (limit: number = 100): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      ORDER BY e.name
      LIMIT ?
    `);

    const exercises = stmt.all(limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get exercise by ID
  getById: (id: string): ExerciseWithParsedFields | null => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE e.id = ?
    `);

    const exercise = stmt.get(id) as any;
    return exercise ? parseExerciseFields(exercise) : null;
  },

  // Search exercises with multiple filters
  search: (params: ExerciseSearchParams): PaginatedResult<ExerciseWithParsedFields> => {
    let sql = `
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE 1=1
    `;

    const values: any[] = [];
    const conditions: string[] = [];

    // Text search
    if (params.query) {
      conditions.push(`(e.name LIKE ? OR e.primary_muscles LIKE ? OR e.secondary_muscles LIKE ?)`);
      const searchTerm = `%${params.query}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (params.category_id) {
      conditions.push(`e.category_id = ?`);
      values.push(params.category_id);
    }

    // Equipment filter
    if (params.equipment) {
      conditions.push(`e.equipment = ?`);
      values.push(params.equipment);
    }

    // Level filter
    if (params.level) {
      conditions.push(`e.level = ?`);
      values.push(params.level);
    }

    // Muscle group filter (uses proper JSON array matching)
    if (params.muscle_group) {
      conditions.push(`(
        EXISTS (
          SELECT 1 FROM json_each(e.primary_muscles) 
          WHERE json_each.value = ?
        ) OR EXISTS (
          SELECT 1 FROM json_each(e.secondary_muscles) 
          WHERE json_each.value = ?
        )
      )`);
      values.push(params.muscle_group, params.muscle_group);
    }

    // Primary muscle filter
    if (params.primary_muscle) {
      conditions.push(`e.primary_muscles LIKE ?`);
      values.push(`%${params.primary_muscle}%`);
    }

    // Force filter
    if (params.force) {
      conditions.push(`e.force = ?`);
      values.push(params.force);
    }

    // Add conditions to SQL
    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    // Count total for pagination
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const totalResult = db.prepare(countSql).get(...values) as { total: number };
    const total = totalResult.total;

    // Add ordering and pagination
    sql += ` ORDER BY e.name`;
    
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    sql += ` LIMIT ? OFFSET ?`;
    values.push(limit, offset);

    // Execute search
    const exercises = db.prepare(sql).all(...values) as any[];
    const parsedExercises = exercises.map(parseExerciseFields);

    return {
      data: parsedExercises,
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      hasMore: offset + limit < total
    };
  },

  // Get exercises by category
  getByCategory: (categoryId: string, limit: number = 50): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE e.category_id = ?
      ORDER BY e.name
      LIMIT ?
    `);

    const exercises = stmt.all(categoryId, limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get exercises by muscle group
  getByMuscle: (muscle: string, limit: number = 50): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE e.primary_muscles LIKE ? OR e.secondary_muscles LIKE ?
      ORDER BY e.name
      LIMIT ?
    `);

    const muscleTerm = `%${muscle}%`;
    const exercises = stmt.all(muscleTerm, muscleTerm, limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get exercises by equipment
  getByEquipment: (equipment: string, limit: number = 50): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE e.equipment = ?
      ORDER BY e.name
      LIMIT ?
    `);

    const exercises = stmt.all(equipment, limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get recent exercises for a user (based on their workout history)
  getRecentForUser: (userId: string, limit: number = 10): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT DISTINCT
        e.*,
        ec.name as category_name,
        MAX(ws.date) as last_used
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      JOIN workout_sets wst ON e.id = wst.exercise_id
      JOIN workout_sessions ws ON wst.workout_id = ws.id
      WHERE ws.user_id = ?
      GROUP BY e.id
      ORDER BY last_used DESC, e.name
      LIMIT ?
    `);

    const exercises = stmt.all(userId, limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get popular exercises (most frequently used)
  getPopular: (limit: number = 20): ExerciseWithParsedFields[] => {
    const stmt = db.prepare(`
      SELECT 
        e.*,
        ec.name as category_name,
        COUNT(wst.id) as usage_count
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      LEFT JOIN workout_sets wst ON e.id = wst.exercise_id
      GROUP BY e.id
      ORDER BY usage_count DESC, e.name
      LIMIT ?
    `);

    const exercises = stmt.all(limit) as any[];
    return exercises.map(parseExerciseFields);
  },

  // Get all unique equipment types
  getEquipmentTypes: (): string[] => {
    const stmt = db.prepare(`
      SELECT DISTINCT equipment 
      FROM exercises 
      WHERE equipment IS NOT NULL AND equipment != ''
      ORDER BY equipment
    `);

    const results = stmt.all() as { equipment: string }[];
    return results.map(r => r.equipment);
  },

  // Get all unique muscle groups
  getMuscleGroups: (): string[] => {
    const stmt = db.prepare(`
      SELECT DISTINCT 
        json_each.value as muscle
      FROM exercises, json_each(exercises.primary_muscles)
      WHERE json_each.value IS NOT NULL
      UNION
      SELECT DISTINCT 
        json_each.value as muscle
      FROM exercises, json_each(exercises.secondary_muscles)
      WHERE json_each.value IS NOT NULL
      ORDER BY muscle
    `);

    const results = stmt.all() as { muscle: string }[];
    return results.map(r => r.muscle);
  }
};

// Helper function to parse JSON fields in exercise data
function parseExerciseFields(exercise: any): ExerciseWithParsedFields {
  return {
    ...exercise,
    primary_muscles: JSON.parse(exercise.primary_muscles || '[]'),
    secondary_muscles: JSON.parse(exercise.secondary_muscles || '[]'),
    instructions: JSON.parse(exercise.instructions || '[]'),
    images: JSON.parse(exercise.images || '[]'),
    created_at: new Date(exercise.created_at),
    updated_at: new Date(exercise.updated_at)
  };
}

// Exercise categories queries
export const categoryQueries = {
  getAll: () => {
    const stmt = db.prepare(`
      SELECT id, name, description, created_at 
      FROM exercise_categories 
      ORDER BY name
    `);
    
    return stmt.all();
  },

  getById: (id: string) => {
    const stmt = db.prepare(`
      SELECT id, name, description, created_at 
      FROM exercise_categories 
      WHERE id = ?
    `);
    
    return stmt.get(id);
  },

  getWithCounts: () => {
    const stmt = db.prepare(`
      SELECT 
        ec.id,
        ec.name,
        ec.description,
        COUNT(e.id) as exercise_count
      FROM exercise_categories ec
      LEFT JOIN exercises e ON ec.id = e.category_id
      GROUP BY ec.id, ec.name, ec.description
      ORDER BY ec.name
    `);
    
    return stmt.all();
  }
};