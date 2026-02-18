// Test script to check better-auth expected schema
import { betterAuth } from "better-auth";
import Database from 'better-sqlite3';

// Create a temporary database to see what better-auth expects
const tempDb = new Database(':memory:');

const auth = betterAuth({
  database: tempDb,
  secret: 'test-secret',
  socialProviders: {
    google: {
      clientId: 'test',
      clientSecret: 'test',
    },
  },
  user: {
    fields: {
      email: "email",
      name: "name", 
      image: "image",
      emailVerified: "emailVerified",
      createdAt: "createdAt",
      updatedAt: "updatedAt"
    },
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      weightUnit: {
        type: "string", 
        defaultValue: "lbs",
      },
      theme: {
        type: "string",
        defaultValue: "dark",
      }
    }
  }
});

console.log('Auth instance created');

// Try to get the schema information
try {
  const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables created by better-auth:', tables);
  
  for (const table of tables) {
    const schema = tempDb.prepare(`PRAGMA table_info(${table.name})`).all();
    console.log(`\nTable: ${table.name}`);
    console.log('Columns:', schema);
  }
} catch (error) {
  console.error('Error getting schema:', error);
}

tempDb.close();