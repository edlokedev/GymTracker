import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface DatabaseConfig {
  path: string;
  verbose?: boolean;
  readonly?: boolean;
  fileMustExist?: boolean;
}

class DatabaseManager {
  private static instance: Database.Database | null = null;
  private static config: DatabaseConfig | null = null;

  static configure(config: Partial<DatabaseConfig> = {}): void {
    const platform = process.platform;
    let defaultDbDir: string;

    // Platform-specific database location
    switch (platform) {
      case 'win32':
        defaultDbDir = join(process.env.APPDATA || homedir(), 'GymTracker');
        break;
      case 'darwin':
        defaultDbDir = join(homedir(), 'Library', 'Application Support', 'GymTracker');
        break;
      default:
        defaultDbDir = join(homedir(), '.local', 'share', 'GymTracker');
    }

    // Ensure directory exists
    if (!existsSync(defaultDbDir)) {
      mkdirSync(defaultDbDir, { recursive: true, mode: 0o755 });
    }

    this.config = {
      path: join(defaultDbDir, 'gymtracker.db'),
      verbose: process.env.NODE_ENV === 'development',
      readonly: false,
      fileMustExist: false,
      ...config,
    };
  }

  static getInstance(): Database.Database {
    if (!this.instance) {
      if (!this.config) {
        this.configure();
      }

      if (!this.config) {
        throw new Error('Database configuration failed');
      }

      try {
        this.instance = new Database(this.config.path, {
          verbose: this.config.verbose ? console.log : undefined,
          readonly: this.config.readonly,
          fileMustExist: this.config.fileMustExist,
        });

        // Configure database settings
        this.instance.pragma('foreign_keys = ON');
        this.instance.pragma('journal_mode = WAL');
        this.instance.pragma('synchronous = NORMAL');
        this.instance.pragma('cache_size = 10000');

        console.log(`Database connected: ${this.config.path}`);

        // Run initial setup
        this.runMigrations();
        
        // Run seeding automatically after successful migration
        this.runSeeds().catch(error => {
          console.error('Initial seeding failed:', error);
        });
      } catch (error) {
        console.error('Failed to connect to database:', error);
        throw new Error(`Database connection failed: ${error}`);
      }
    }

    return this.instance;
  }

  private static runMigrations(): void {
    if (!this.instance) {
      throw new Error('Database instance not available');
    }

    try {
      // Read and execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      if (existsSync(schemaPath)) {
        const schema = readFileSync(schemaPath, 'utf-8');
        this.instance.exec(schema);
        console.log('Database schema initialized');
      } else {
        console.warn('Schema file not found, skipping initialization');
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw new Error(`Migration failed: ${error}`);
    }
  }

  static async runSeeds(): Promise<void> {
    const db = this.getInstance();

    try {
      // Import and run user seeder first (needed for foreign key constraints)
      const { UserSeeder } = await import('./seeders/users');

      // Check if user data already exists
      const userCount = db.prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };

      if (userCount.count === 0) {
        console.log('Seeding user data...');
        await UserSeeder.seedMockUsers();
      } else {
        console.log(`User data already exists (${userCount.count} users)`);
      }

      // Import and run exercise seeder
      const { ExerciseSeeder } = await import('./seeders/exercises');

      // Check if exercise data already exists
      const exerciseCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };

      if (exerciseCount.count === 0) {
        console.log('Seeding exercise data...');
        await ExerciseSeeder.seedAll();
      } else {
        console.log(`Exercise data already exists (${exerciseCount.count} exercises)`);
      }
    } catch (error) {
      console.error('Seeding failed:', error);
      throw new Error(`Seeding failed: ${error}`);
    }
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      console.log('Database connection closed');
    }
  }

  static getPath(): string | null {
    return this.config?.path || null;
  }

  // Development helper methods
  static reset(): void {
    if (this.instance) {
      this.instance.exec(`
        DELETE FROM workout_sets;
        DELETE FROM workout_sessions;
        DELETE FROM exercises;
        DELETE FROM exercise_categories;
      `);
      console.log('Database reset complete');
    }
  }

  static vacuum(): void {
    if (this.instance) {
      this.instance.exec('VACUUM;');
      console.log('Database vacuumed');
    }
  }

  static checkIntegrity(): boolean {
    if (!this.instance) return false;

    try {
      const result = this.instance.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
      return result.integrity_check === 'ok';
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();
export { DatabaseManager };

// Graceful shutdown handling
process.on('exit', () => DatabaseManager.close());
process.on('SIGINT', () => {
  DatabaseManager.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  DatabaseManager.close();
  process.exit(0);
});