# GymTracker Context

## Glossary

### Authenticated User

Person signed in through Supabase Auth. Their Supabase Auth user id is the canonical owner id for private workout data.

### Profile

One-to-one app record for an authenticated user. Stores small user-facing preferences such as weight unit and theme, plus display metadata.

### Exercise Catalog

Shared library of exercise definitions, categories, equipment, muscle groups, instructions, and images. Catalog data is not owned by one user.

### Exercise Image URL

Public CDN URL for an exercise catalog image. GymTracker derives these from Free Exercise DB image paths using jsDelivr rather than storing image files in Supabase Storage during the first migration.

### Workout Session

A dated workout owned by one authenticated user. It groups workout sets and may include notes, start time, and end time.

### Workout Set

A logged effort for one exercise inside one workout session. It records set order, reps, weight, rest time, and optional notes.

### Row Level Security

Database authorization boundary in Supabase Postgres. Private workout tables must enforce ownership with the authenticated user's id.
