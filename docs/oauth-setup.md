# OAuth Setup Instructions

## Google OAuth Configuration

To enable Google OAuth login, you need to:

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API or Google OAuth API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application" as the application type
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://yourdomain.com/api/auth/callback/google` (for production)

### 2. Set Environment Variables

Create a `.env` file in your project root:

```bash
# Copy from .env.example and fill in your values
cp .env.example .env
```

Then edit `.env` with your actual values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_actual_google_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_google_client_secret_here

# Database
DATABASE_URL=file:./database.sqlite

# Better Auth Secret (generate a random 32+ character string)
BETTER_AUTH_SECRET=your_32_character_random_secret_here
```

### 3. Generate a Secret Key

For `BETTER_AUTH_SECRET`, generate a random string:

```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use OpenSSL
openssl rand -hex 32

# Option 3: Use online generator (for development only)
# Visit: https://generate-secret.vercel.app/32
```

### 4. Database Setup

The database will be automatically created when you first run the app. The OAuth tables are already included in the schema.

### 5. Testing

1. Start the development server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should see the login page
4. Click "Sign in with Google" to test the OAuth flow

## Production Deployment

For production:

1. Set up your production Google OAuth credentials with the correct redirect URI
2. Use secure environment variables (never commit `.env` to git)
3. Generate a strong random secret for `BETTER_AUTH_SECRET`
4. Configure your production base URL in the auth config

## Security Notes

- Never commit `.env` files to version control
- Use strong random secrets in production
- Keep your Google OAuth credentials secure
- Configure proper CORS settings for your domain