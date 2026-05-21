import { betterAuth } from "better-auth"
import { reactStartCookies } from "better-auth/react-start"
import { db } from "../database/db"
import { env } from "../env"

// Better Auth configuration for TanStack Start
export const auth = betterAuth({
  database: db, // Use the SQLite database directly
  
  secret: env.BETTER_AUTH_SECRET,
  
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins: [
    reactStartCookies() // make sure this is the last plugin in the array
  ],

  // Configure session and security
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  // URLs for OAuth flow
  baseURL: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
  
  // TanStack Start specific configuration
  trustedOrigins: ["http://localhost:3000"],
  
  // User configuration
  user: {
    fields: {
      email: "email",
      name: "name", 
      image: "image",
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at"
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
  },

  // Account configuration for OAuth providers
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"]
    }
  }
})

export type Session = typeof auth.$Infer.Session