import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { db } from '../db';
import type { FreeExerciseDBExercise } from '../../types/database';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExerciseSeeder {
  static async seedAll(): Promise<void> {
    console.log('Starting exercise seeding...');

    // First seed categories
    await this.seedCategories();

    // Then seed exercises
    await this.seedExercises();

    console.log('Exercise seeding completed successfully');
  }

  static async seedCategories(): Promise<void> {
    const categories = [
      {
        id: 'strength',
        name: 'Strength',
        description: 'Strength training exercises including weightlifting and resistance training'
      },
      {
        id: 'cardio',
        name: 'Cardio',
        description: 'Cardiovascular exercises for endurance and heart health'
      },
      {
        id: 'stretching',
        name: 'Stretching',
        description: 'Flexibility and mobility exercises'
      },
      {
        id: 'plyometrics',
        name: 'Plyometrics',
        description: 'Explosive power and jumping exercises'
      },
      {
        id: 'powerlifting',
        name: 'Powerlifting',
        description: 'Powerlifting focused exercises (squat, bench, deadlift variations)'
      },
      {
        id: 'olympic-weightlifting',
        name: 'Olympic Weightlifting',
        description: 'Olympic lifting movements (snatch, clean & jerk, etc.)'
      },
      {
        id: 'strongman',
        name: 'Strongman',
        description: 'Strongman training exercises with specialized equipment'
      }
    ];

    const insertCategory = db.prepare(`
      INSERT OR REPLACE INTO exercise_categories (id, name, description)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((cats: Array<{id: string, name: string, description: string}>) => {
      for (const category of cats) {
        insertCategory.run(category.id, category.name, category.description);
      }
    });

    insertMany(categories);
    console.log(`Seeded ${categories.length} exercise categories`);
  }

  static async seedExercises(): Promise<void> {
    try {
      // Load exercise data from Free Exercise DB JSON
      const exercisesPath = join(__dirname, '../data/exercises.json');
      const rawData = readFileSync(exercisesPath, 'utf-8');
      const exercisesData: FreeExerciseDBExercise[] = JSON.parse(rawData);

      console.log(`Loading ${exercisesData.length} exercises from Free Exercise DB...`);

      // Prepare batch insert statement
      const insertExercise = db.prepare(`
        INSERT OR REPLACE INTO exercises (
          id, name, category_id, force, level, mechanic, equipment,
          primary_muscles, secondary_muscles, instructions, images
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Transform and insert exercises in batches
      const insertMany = db.transaction((exercises: FreeExerciseDBExercise[]) => {
        for (const exercise of exercises) {
          insertExercise.run(
            exercise.id,
            exercise.name,
            this.mapCategory(exercise.category),
            exercise.force,
            exercise.level,
            exercise.mechanic,
            exercise.equipment,
            JSON.stringify(exercise.primaryMuscles),
            JSON.stringify(exercise.secondaryMuscles),
            JSON.stringify(exercise.instructions),
            JSON.stringify(exercise.images)
          );
        }
      });

      // Execute batch insert
      insertMany(exercisesData);

      console.log(`Successfully seeded ${exercisesData.length} exercises`);

      // Log statistics
      this.logSeederStats();
    } catch (error) {
      console.error('Exercise seeding failed:', error);
      throw new Error(`Exercise seeding failed: ${error}`);
    }
  }

  private static mapCategory(category: string): string {
    // Map Free Exercise DB categories to our category IDs
    const categoryMap: Record<string, string> = {
      'strength': 'strength',
      'cardio': 'cardio',
      'stretching': 'stretching',
      'plyometrics': 'plyometrics',
      'powerlifting': 'powerlifting',
      'olympic weightlifting': 'olympic-weightlifting',
      'strongman': 'strongman'
    };

    return categoryMap[category] || 'strength'; // Default to strength if not found
  }

  private static logSeederStats(): void {
    try {
      // Get statistics about seeded data
      const stats = {
        totalExercises: db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number },
        byCategory: db.prepare(`
          SELECT ec.name, COUNT(e.id) as count 
          FROM exercise_categories ec 
          LEFT JOIN exercises e ON ec.id = e.category_id 
          GROUP BY ec.id, ec.name
          ORDER BY count DESC
        `).all() as { name: string; count: number }[],
        byLevel: db.prepare(`
          SELECT level, COUNT(*) as count 
          FROM exercises 
          WHERE level IS NOT NULL 
          GROUP BY level
          ORDER BY count DESC
        `).all() as { level: string; count: number }[],
        byEquipment: db.prepare(`
          SELECT equipment, COUNT(*) as count 
          FROM exercises 
          WHERE equipment IS NOT NULL 
          GROUP BY equipment
          ORDER BY count DESC
          LIMIT 10
        `).all() as { equipment: string; count: number }[]
      };

      console.log('\n=== Exercise Database Statistics ===');
      console.log(`Total Exercises: ${stats.totalExercises.count}`);
      
      console.log('\nBy Category:');
      stats.byCategory.forEach(cat => {
        console.log(`  ${cat.name}: ${cat.count} exercises`);
      });

      console.log('\nBy Difficulty Level:');
      stats.byLevel.forEach(level => {
        console.log(`  ${level.level}: ${level.count} exercises`);
      });

      console.log('\nTop Equipment Types:');
      stats.byEquipment.forEach(eq => {
        console.log(`  ${eq.equipment}: ${eq.count} exercises`);
      });
      console.log('=====================================\n');
    } catch (error) {
      console.error('Failed to generate statistics:', error);
    }
  }

  // Utility method to get random exercises for testing
  static getRandomExercises(count: number = 5): any[] {
    const stmt = db.prepare(`
      SELECT e.*, ec.name as category_name 
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      ORDER BY RANDOM()
      LIMIT ?
    `);
    
    return stmt.all(count);
  }

  // Utility method to search exercises (for testing the search functionality)
  static searchExercises(query: string, limit: number = 10): any[] {
    const stmt = db.prepare(`
      SELECT e.*, ec.name as category_name 
      FROM exercises e
      JOIN exercise_categories ec ON e.category_id = ec.id
      WHERE e.name LIKE ? OR e.primary_muscles LIKE ?
      ORDER BY e.name
      LIMIT ?
    `);
    
    const searchTerm = `%${query}%`;
    return stmt.all(searchTerm, searchTerm, limit);
  }
}