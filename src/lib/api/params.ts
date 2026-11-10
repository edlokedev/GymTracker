import { badRequest } from './errors'

// Strict integer query-param parsing for list routes. `parseInt` alone turns
// `limit=abc` into NaN and `limit=0` into an empty/negative `.range()`, which
// reaches Postgres as a 500. Here: missing/empty -> default; non-integer or
// below `min` -> 400 through the BadRequest path; above `max` -> clamped.
export function parseIntParam(
  raw: string | null,
  opts: { name: string; defaultValue: number; min: number; max: number },
): number {
  if (raw === null || raw === '') return opts.defaultValue
  if (!/^-?\d+$/.test(raw)) badRequest(`${opts.name} must be an integer`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < opts.min) {
    badRequest(`${opts.name} must be an integer >= ${opts.min}`)
  }
  return Math.min(value, opts.max)
}
