# GymTracker Context

## Glossary

### Authenticated User

Person signed in through Supabase Auth. Their Supabase Auth user id is the canonical owner id for private workout data.

### Profile

One-to-one app record for an authenticated user. Stores small user-facing preferences such as weight unit and theme, plus display metadata.

### Exercise Catalog

Shared library of exercise definitions, categories, equipment, muscle groups, instructions, and images. The catalog is shared by everyone; entries are either Seed Exercises or Custom Exercises.

### Seed Exercise

A catalog exercise that came from the Free Exercise DB import. It has no creator and is only writable by the service role.

### Custom Exercise

A catalog exercise created by an Authenticated User from inside the app. It is shared into the same Exercise Catalog and behaves like any Seed Exercise once created — searchable, filterable, favouritable, and selectable for a Workout Set. It records the creator's id so that only the creator can edit or archive it; everyone else can see and use it.

### Archived Exercise

A Custom Exercise its creator has retired. An Archived Exercise is hidden from search, filters, favourites, and the exercise picker, but it stays resolvable by id so historical Workout Sets that reference it still render. Archiving never deletes Workout Set history.

### Exercise Image URL

Public CDN URL for an exercise image. Seed Exercises derive these from Free Exercise DB image paths using jsDelivr. Custom Exercises store images the creator uploads to a public Supabase Storage bucket; the column still holds a public URL so the same media helper can render either source.

### Workout Session

A dated workout owned by one authenticated user. It groups workout sets and may include notes, start time, end time, and a Workout Location.

### Workout Location

A free-text name for the physical place where a Workout Session occurred (e.g. "Planet Fitness", "Home Garage"). Stored as `location_name text` directly on the `workout_sessions` row — no separate locations table. Optional on every session, editable at any time (during active session or on past sessions). The UI autocompletes from the authenticated user's own distinct past location names.

### Workout Set

A logged effort for one exercise inside one workout session. It records set order, reps, weight, rest time, and optional notes.

### Row Level Security

Database authorization boundary in Supabase Postgres. Private workout tables must enforce ownership with the authenticated user's id.

### Route Contract

Single source of truth for one HTTP route's request and response shape. Names the path, the allowed methods, and the schema of each method's query, body, and response. The server handler parses requests against it, the feature client types responses from it, and contract tests assert responses against it.

### API Envelope

Uniform JSON wrapper around every private and public API route's response. Success carries the route's data under a success flag; failure carries a single error message under a failure flag. Routes that return redirects are outside the envelope.
