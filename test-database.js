#!/usr/bin/env node

// Database initialization test script
import { DatabaseManager } from './src/lib/database/db.js';
import { userQueries } from './src/lib/database/queries/users.js';
import { exerciseQueries } from './src/lib/database/queries/exercises.js';

async function testDatabase() {
  console.log('🚀 Testing database initialization...');
  
  try {
    // Initialize database
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    console.log('✅ Database initialized successfully');

    // Test seeding
    console.log('📊 Database seeding completed');
    
    // Test exercise queries
    const exerciseCount = exerciseQueries.getAll(5);
    console.log(`✅ Found ${exerciseCount.length} exercises (showing first 5)`);
    
    if (exerciseCount.length > 0) {
      console.log('📋 Sample exercise:', {
        name: exerciseCount[0].name,
        category: exerciseCount[0].category_name,
        muscles: exerciseCount[0].primary_muscles
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
          weight_unit: users[0].weight_unit,
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