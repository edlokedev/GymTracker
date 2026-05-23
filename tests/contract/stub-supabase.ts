// In-memory stub Supabase client for contract tests.
//
// Implements the subset of the @supabase/supabase-js builder chain used by
// our query modules:
//   .from(t).select(cols, { count? })
//   .eq() / .neq() / .in() / .is() / .not() / .or() / .gte() / .lte()
//   .order() / .range() / .limit()
//   .single() / .maybeSingle()
//   .insert(row).select(cols).single()
//   .update(patch).eq().select(cols).maybeSingle()
//   .delete().eq().select(cols)
//
// A tiny RLS simulator hides rows whose user_id does not match the injected
// `userId` from SELECTs, and rejects mutations against another user's row
// with a `42501` (insufficient_privilege) Postgres-style error.
//
// "Transitive ownership" (workout_sets belong to a workout_session belonging
// to the user) is modeled by passing the parent table's user_id down to its
// children via the `parentTable` option per table.

export type StubRow = Record<string, unknown>

export interface StubTables {
  [tableName: string]: StubRow[]
}

export interface StubOptions {
  userId?: string | null
  // Per-table parent table map for transitive RLS. Used so workout_sets
  // get scoped to the user through their parent workout_session.
  parentRefs?: Record<string, { table: string; childKey: string; parentKey?: string }>
}

interface QueryState {
  table: string
  selectCols: string
  count: 'exact' | null
  filters: Array<(row: StubRow) => boolean>
  // for .order
  orderBys: Array<{ key: string; ascending: boolean }>
  rangeFrom: number | null
  rangeTo: number | null
  limitN: number | null
  // mutation state
  mode: 'select' | 'insert' | 'update' | 'delete'
  insertRow: StubRow | null
  updatePatch: StubRow | null
}

// Read a possibly-dotted column path off a row: `workout_sessions.user_id`
// reads the row's embedded `workout_sessions` then `.user_id`. This mirrors
// how PostgREST embeds resolve filters across joined tables.
function readCol(row: StubRow, col: string): unknown {
  if (!col.includes('.')) return row[col]
  return col.split('.').reduce<unknown>((acc, part) => {
    if (acc == null || typeof acc !== 'object') return undefined
    return (acc as Record<string, unknown>)[part]
  }, row)
}

const PGRST116 = { code: 'PGRST116', message: 'no rows' }
const RLS_42501 = { code: '42501', message: 'insufficient_privilege' }

function freshState(table: string): QueryState {
  return {
    table,
    selectCols: '*',
    count: null,
    filters: [],
    orderBys: [],
    rangeFrom: null,
    rangeTo: null,
    limitN: null,
    mode: 'select',
    insertRow: null,
    updatePatch: null,
  }
}

function applyFilters(rows: StubRow[], state: QueryState): StubRow[] {
  let out = rows
  for (const f of state.filters) out = out.filter(f)
  for (const order of state.orderBys) {
    out = [...out].sort((a, b) => {
      const av = a[order.key]
      const bv = b[order.key]
      if (av == null && bv == null) return 0
      if (av == null) return order.ascending ? -1 : 1
      if (bv == null) return order.ascending ? 1 : -1
      if (av < bv) return order.ascending ? -1 : 1
      if (av > bv) return order.ascending ? 1 : -1
      return 0
    })
  }
  return out
}

export function stubSupabase(tables: StubTables, options: StubOptions = {}) {
  // Deep-clone so tests can't mutate the original fixtures inadvertently.
  const data: StubTables = {}
  for (const [k, rows] of Object.entries(tables)) data[k] = rows.map((r) => ({ ...r }))
  const userId = options.userId ?? null
  const parentRefs = options.parentRefs ?? {}

  // True iff the row passes the ownership check for this table.
  function ownsRow(table: string, row: StubRow): boolean {
    if (userId == null) return true
    if ('user_id' in row) return row.user_id === userId
    const parent = parentRefs[table]
    if (parent) {
      const parentRows = data[parent.table] ?? []
      const childKey = parent.childKey
      const parentKey = parent.parentKey ?? 'id'
      const match = parentRows.find((p) => p[parentKey] === row[childKey])
      if (!match) return false
      return ownsRow(parent.table, match)
    }
    return true
  }

  function buildQuery(table: string) {
    const state = freshState(table)

    function terminal(rows: StubRow[]) {
      // Apply default per-table RLS to SELECT results.
      const visible = state.mode === 'select' ? rows.filter((r) => ownsRow(table, r)) : rows
      const ordered = applyFilters(visible, state)
      const sliced =
        state.rangeFrom != null && state.rangeTo != null
          ? ordered.slice(state.rangeFrom, state.rangeTo + 1)
          : state.limitN != null
            ? ordered.slice(0, state.limitN)
            : ordered
      return { data: sliced, count: state.count === 'exact' ? ordered.length : null }
    }

    const builder: any = {
      // .select(cols, { count?, head? })
      select(cols: string = '*', opts?: { count?: 'exact'; head?: boolean }) {
        state.selectCols = cols
        if (opts?.count) state.count = opts.count
        return builder
      },
      eq(col: string, val: unknown) {
        state.filters.push((r) => readCol(r, col) === val)
        return builder
      },
      neq(col: string, val: unknown) {
        state.filters.push((r) => readCol(r, col) !== val)
        return builder
      },
      in(col: string, vals: unknown[]) {
        state.filters.push((r) => vals.includes(readCol(r, col)))
        return builder
      },
      is(col: string, val: unknown) {
        state.filters.push((r) => readCol(r, col) === val)
        return builder
      },
      not(col: string, _op: string, val: unknown) {
        // We only need `not('equipment', 'is', null)` style.
        state.filters.push((r) => readCol(r, col) !== val)
        return builder
      },
      or(_expr: string) {
        // We don't currently exercise .or() in contract tests; passthrough.
        return builder
      },
      gte(col: string, val: unknown) {
        state.filters.push((r) => (readCol(r, col) as any) >= (val as any))
        return builder
      },
      lte(col: string, val: unknown) {
        state.filters.push((r) => (readCol(r, col) as any) <= (val as any))
        return builder
      },
      order(col: string, opts?: { ascending?: boolean; foreignTable?: string }) {
        // foreignTable ordering is no-op in the stub; we only sort by table cols.
        if (!opts?.foreignTable) {
          state.orderBys.push({ key: col, ascending: opts?.ascending ?? true })
        }
        return builder
      },
      range(from: number, to: number) {
        state.rangeFrom = from
        state.rangeTo = to
        return builder
      },
      limit(n: number) {
        state.limitN = n
        return builder
      },

      // Terminal: single → exactly one row else PGRST116
      async single() {
        const rows = data[table] ?? []
        const { data: out } = terminal(rows)
        if (state.mode === 'insert' && state.insertRow) {
          // RLS on insert: if the row carries a user_id, it must match.
          if (
            userId != null &&
            'user_id' in state.insertRow &&
            state.insertRow.user_id !== userId
          ) {
            return { data: null, error: RLS_42501, count: null }
          }
          const inserted = { ...state.insertRow }
          // Auto-fill id / created_at / updated_at if missing.
          if (!inserted.id) inserted.id = `id-${Math.random().toString(36).slice(2, 10)}`
          if (!inserted.created_at) inserted.created_at = new Date().toISOString()
          if (!inserted.updated_at) inserted.updated_at = new Date().toISOString()
          data[table] = [...(data[table] ?? []), inserted]
          return { data: inserted, error: null, count: null }
        }
        if (out.length === 0) return { data: null, error: PGRST116, count: null }
        return { data: out[0], error: null, count: null }
      },

      async maybeSingle() {
        const rows = data[table] ?? []
        const { data: out } = terminal(rows)
        if (state.mode === 'update' && state.updatePatch) {
          // Find matching row(s); refuse if owned by someone else.
          const all = data[table] ?? []
          const matched = applyFilters(all, state)
          if (matched.length === 0) return { data: null, error: null, count: null }
          const target = matched[0]
          if (!ownsRow(table, target)) {
            return { data: null, error: RLS_42501, count: null }
          }
          Object.assign(target, state.updatePatch, {
            updated_at: new Date().toISOString(),
          })
          return { data: target, error: null, count: null }
        }
        if (out.length === 0) return { data: null, error: null, count: null }
        return { data: out[0], error: null, count: null }
      },

      // Mutations
      insert(row: StubRow) {
        state.mode = 'insert'
        state.insertRow = row
        return builder
      },
      update(patch: StubRow) {
        state.mode = 'update'
        state.updatePatch = patch
        return builder
      },
      delete() {
        state.mode = 'delete'
        return builder
      },

      // Awaitable terminal: returns { data, error, count }.
      then(resolve: (v: any) => void, reject?: (e: any) => void) {
        try {
          const rows = data[table] ?? []
          if (state.mode === 'delete') {
            const all = data[table] ?? []
            const matched = applyFilters(all, state)
            // Refuse if any matched row isn't ours.
            for (const r of matched) {
              if (!ownsRow(table, r)) {
                return resolve({ data: null, error: RLS_42501, count: null })
              }
            }
            const matchedSet = new Set(matched)
            data[table] = all.filter((r) => !matchedSet.has(r))
            return resolve({ data: matched, error: null, count: null })
          }
          const { data: out, count } = terminal(rows)
          resolve({ data: out, error: null, count })
        } catch (err) {
          if (reject) reject(err)
        }
      },
    }
    return builder
  }

  return {
    from(table: string) {
      return buildQuery(table)
    },
    // Expose internal state for assertions if a test needs it.
    _tables: data,
  } as any
}
