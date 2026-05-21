// Environment configuration.
// All secrets must be defined in the .env file — never hardcode them here.
// In TanStack Start/Vite, environment variables are loaded automatically.

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  // --- Supabase ---
  // Supabase rolled out new API key naming in 2026:
  //   * Publishable key (sb_publishable_…) replaces the legacy anon JWT.
  //   * Secret key      (sb_secret_…)      replaces the legacy service_role JWT.
  // The legacy env-var names are still accepted as fallbacks so projects that
  // haven't rotated keys keep working.
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY:
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '',
  SUPABASE_SECRET_KEY:
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}

// Validate the only env vars the runtime actually needs. The secret key is
// only required by server-only paths (seed scripts, admin ops); we omit it
// here so a missing value doesn't crash the React tree on boot.
const required = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] as const
const missing = required.filter((key) => !env[key])

if (missing.length > 0 && env.NODE_ENV !== 'production') {
  console.warn(`⚠️ Missing required env vars: ${missing.join(', ')}`)
  console.warn('Set them in .env — see .env.example.')
}

export default env
