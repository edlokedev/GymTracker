// Database initialization test script
import { DatabaseManager } from '../src/lib/database/db';
import { userQueries } from '../src/lib/database/queries/users';
import { exerciseQueries } from '../src/lib/database/queries/exercises';

async function testDatabase() {
  console.log('🚀 Testing database initialization...');
  
  try {
    // Initialize database (schema is automatically applied)
    DatabaseManager.getInstance();
    console.log('✅ Database initialized successfully');

    // Run seeding
    await DatabaseManager.runSeeds();
    console.log('📊 Database seeding completed');
    
    // Test exercise queries
    const exercises = exerciseQueries.getAll(5);
    console.log(`✅ Found ${exercises.length} exercises (showing first 5)`);
    
    if (exercises.length > 0) {
      console.log('📋 Sample exercise:', {
        name: exercises[0].name,
        category: exercises[0].category_name,
        muscles: exercises[0].primary_muscles
      });
    }

    // Test user queries
    const users = userQueries.getAll(5);
    console.log(`✅ Found ${users.length} users`);
    
    if (users.length > 0) {
      console.log('👤 Sample user:', {
        username: users[0].username,
        email: users[0].email,
        preferences: {
          theme: users[0].theme
        }
      });
    }

    console.log('🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase();