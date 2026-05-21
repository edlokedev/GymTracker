import { db } from '../db';
import type { 
  User,
  CreateUserInput,
  UserPreferences
} from '../../types/database';

export const userQueries = {
  // Create a new user
  create: (data: CreateUserInput): User => {
    const stmt = db.prepare(`
      INSERT INTO users (
        id, username, email, password_hash, theme
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const id = generateId();
    
    stmt.run(
      id,
      data.username,
      data.email,
      data.password, // In real app, this should be hashed
      data.theme || 'dark'
    );

    return getById(id)!;
  },

  // Get user by ID
  getById: (id: string): User | null => {
    return getById(id);
  },

  // Get user by username
  getByUsername: (username: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username) as User | undefined;
    return user ? parseUserDates(user) : null;
  },

  // Get user by email
  getByEmail: (email: string): User | null => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as User | undefined;
    return user ? parseUserDates(user) : null;
  },

  // Update user
  update: (id: string, data: Partial<CreateUserInput>): User | null => {
    const fields: string[] = [];
    const values: any[] = [];

    // Build dynamic update query
    if (data.username !== undefined) {
      fields.push('username = ?');
      values.push(data.username);
    }
    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }
    if (data.password !== undefined) {
      fields.push('password_hash = ?');
      values.push(data.password); // In real app, this should be hashed
    }
    if (data.theme !== undefined) {
      fields.push('theme = ?');
      values.push(data.theme);
    }

    if (fields.length === 0) {
      return getById(id);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0 ? getById(id) : null;
  },

  // Update user preferences
  updatePreferences: (id: string, preferences: UserPreferences): User | null => {
    const stmt = db.prepare(`
      UPDATE users 
      SET theme = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      preferences.theme,
      new Date().toISOString(),
      id
    );

    return result.changes > 0 ? getById(id) : null;
  },

  // Delete user
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  // Check if username exists
  usernameExists: (username: string): boolean => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?');
    const result = stmt.get(username) as { count: number };
    return result.count > 0;
  },

  // Check if email exists
  emailExists: (email: string): boolean => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = stmt.get(email) as { count: number };
    return result.count > 0;
  },

  // Validate user credentials (for login)
  validateCredentials: (username: string, password: string): User | null => {
    const user = userQueries.getByUsername(username);
    if (!user) return null;

    // In a real app, you would compare hashed passwords
    // For now, we'll just check if the password matches the stored hash
    if (user.password_hash === password) {
      return user;
    }
    
    return null;
  },

  // Get user statistics
  getStats: (id: string) => {
    const stmt = db.prepare(`
      SELECT 
        COUNT(DISTINCT ws.id) as total_workouts,
        COUNT(DISTINCT wst.id) as total_sets,
        COUNT(DISTINCT wst.exercise_id) as unique_exercises,
        SUM(wst.weight * wst.reps) as total_volume,
        MAX(ws.date) as last_workout_date,
        MIN(ws.date) as first_workout_date
      FROM users u
      LEFT JOIN workout_sessions ws ON u.id = ws.user_id
      LEFT JOIN workout_sets wst ON ws.id = wst.workout_id
      WHERE u.id = ?
    `);

    return stmt.get(id);
  },

  // Get all users (admin function)
  getAll: (limit: number = 100): User[] => {
    const stmt = db.prepare(`
      SELECT * FROM users 
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const users = stmt.all(limit) as User[];
    return users.map(parseUserDates);
  }
};

// Helper functions
function getById(id: string): User | null {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const user = stmt.get(id) as User | undefined;
  return user ? parseUserDates(user) : null;
}

function parseUserDates(user: User): User {
  return {
    ...user,
    created_at: new Date(user.created_at),
    updated_at: new Date(user.updated_at)
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}