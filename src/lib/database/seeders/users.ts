import { db } from '../db';
import type { CreateUserInput } from '../../types/database';

export class UserSeeder {
  static async seedMockUsers(): Promise<void> {
    console.log('Seeding mock users...');

    const mockUsers: CreateUserInput[] = [
      {
        username: 'test_user',
        email: 'test@gymtracker.app',
        password: 'test123', // In production, this would be hashed
        theme: 'dark'
      },
      {
        username: 'demo_user',
        email: 'demo@gymtracker.app',
        password: 'demo123', // In production, this would be hashed
        theme: 'dark'
      },
      {
        username: 'jane_fitness',
        email: 'jane@example.com',
        password: 'password123',
        theme: 'light'
      }
    ];

    const insertUser = db.prepare(`
      INSERT OR REPLACE INTO user (
        id, username, email, password, theme
      ) VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((users: CreateUserInput[]) => {
      for (const user of users) {
        const userId = this.generateUserId();
        const password = user.password ? this.hashPassword(user.password) : null; // Mock hash function
        
        insertUser.run(
          userId,
          user.username,
          user.email,
          password,
          user.theme || 'dark'
        );
      }
    });

    insertMany(mockUsers);
    console.log(`Seeded ${mockUsers.length} mock users`);

    // Log created users (without passwords)
    this.logUsers();
  }

  private static generateUserId(): string {
    return 'user_' + Math.random().toString(36).substr(2, 9);
  }

  private static hashPassword(password: string): string {
    // Mock password hashing - in production use bcrypt or similar
    return `mock_hash_${password}_${Date.now()}`;
  }

  private static logUsers(): void {
    const users = db.prepare(`
      SELECT id, username, email, weightUnit, theme, created_at 
      FROM user 
      ORDER BY created_at DESC
    `).all();

    console.log('\n=== Mock Users Created ===');
    users.forEach((user: any) => {
      console.log(`  ${user.username} (${user.email}) - ${user.weightUnit}, ${user.theme} theme`);
    });
    console.log('=========================\n');
  }

  // Get a demo user for testing
  static getDemoUser(): any {
    return db.prepare(`
      SELECT id, username, email, weightUnit, theme, created_at 
      FROM user 
      WHERE username = 'demo_user' 
      LIMIT 1
    `).get();
  }

  // Get a test user for testing
  static getTestUser(): any {
    return db.prepare(`
      SELECT id, username, email, weightUnit, theme, created_at 
      FROM user 
      WHERE username = 'test_user' 
      LIMIT 1
    `).get();
  }

  // Create a single user for testing with custom properties
  static createUser(overrides: Partial<CreateUserInput> = {}): any {
    const defaultUser = {
      username: 'test_user_' + Date.now(),
      email: `test_${Date.now()}@example.com`,
      password: 'test123',
      weight_unit: 'lbs',
      theme: 'dark',
      ...overrides
    };

    const userId = this.generateUserId();
    const password = this.hashPassword(defaultUser.password!);

    const insertUser = db.prepare(`
      INSERT INTO user (id, username, email, password, weightUnit, theme)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      userId,
      defaultUser.username,
      defaultUser.email,
      password,
      defaultUser.weight_unit,
      defaultUser.theme
    );

    return db.prepare(`
      SELECT id, username, email, weightUnit, theme, created_at 
      FROM user 
      WHERE id = ?
    `).get(userId);
  }

  // Authentication helper for mock system
  static authenticateUser(username: string, password: string): any {
    const user = db.prepare(`
      SELECT id, username, email, password, weightUnit, theme, created_at 
      FROM user 
      WHERE username = ? OR email = ?
    `).get(username, username) as any;

    if (!user) {
      return null;
    }

    // Mock password verification - in production use bcrypt.compare
    const isValidPassword = user.password && user.password.includes(password);
    
    if (!isValidPassword) {
      return null;
    }

    // Return user without password hash
    const { password: userPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user preferences
  static getUserPreferences(userId: string): any {
    return db.prepare(`
      SELECT weightUnit, theme 
      FROM user 
      WHERE id = ?
    `).get(userId);
  }

  // Update user preferences
  static updateUserPreferences(userId: string, preferences: { weight_unit?: 'lbs' | 'kg', theme?: 'light' | 'dark' }): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (preferences.weight_unit) {
      updates.push('weightUnit = ?');
      values.push(preferences.weight_unit);
    }

    if (preferences.theme) {
      updates.push('theme = ?');
      values.push(preferences.theme);
    }

    if (updates.length > 0) {
      values.push(userId);
      
      const stmt = db.prepare(`
        UPDATE user 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      
      stmt.run(...values);
    }
  }
}