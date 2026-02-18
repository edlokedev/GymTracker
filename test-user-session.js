// Quick test script to check if users were seeded and test workout session creation
import { UserSeeder } from './src/lib/database/seeders/users.js';
import { workoutQueries } from './src/lib/database/queries/workouts.js';

console.log('Testing user seeding and workout session creation...');

try {
  // Check if test_user exists
  const testUser = UserSeeder.getTestUser();
  console.log('Test user:', testUser);

  // Check if demo_user exists  
  const demoUser = UserSeeder.getDemoUser();
  console.log('Demo user:', demoUser);

  if (testUser) {
    // Try to create a workout session for test_user
    const sessionData = {
      user_id: testUser.id,
      name: 'Test Workout Session',
      date: new Date().toISOString().split('T')[0],
      notes: 'Testing session creation',
      start_time: new Date().toISOString()
    };

    console.log('Creating workout session with data:', sessionData);
    const session = workoutQueries.createSession(sessionData);
    console.log('Created session:', session);
  } else {
    console.log('❌ test_user not found - seeding may have failed');
  }

} catch (error) {
  console.error('Error:', error);
}