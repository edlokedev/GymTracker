import type { createServerClient } from '@supabase/ssr'
import type { Database } from './database.types'

type QueryError = { code?: string | null; message?: string | null } | null

export interface QueryResult<TData = unknown> {
  data: TData | null
  error: QueryError
  count?: number | null
}

interface SelectOptions {
  count?: 'exact'
  head?: boolean
}

interface OrderOptions {
  ascending?: boolean
  foreignTable?: string
}

export interface QueryBuilder<TData = unknown> extends PromiseLike<QueryResult<TData[]>> {
  select(columns?: string, options?: SelectOptions): QueryBuilder<TData>
  eq(column: string, value: unknown): QueryBuilder<TData>
  neq(column: string, value: unknown): QueryBuilder<TData>
  in(column: string, values: readonly unknown[]): QueryBuilder<TData>
  is(column: string, value: unknown): QueryBuilder<TData>
  not(column: string, operator: string, value: unknown): QueryBuilder<TData>
  or(expression: string): QueryBuilder<TData>
  gte(column: string, value: unknown): QueryBuilder<TData>
  lte(column: string, value: unknown): QueryBuilder<TData>
  order(column: string, options?: OrderOptions): QueryBuilder<TData>
  range(from: number, to: number): QueryBuilder<TData>
  limit(count: number): QueryBuilder<TData>
  single(): Promise<QueryResult<TData>>
  maybeSingle(): Promise<QueryResult<TData | null>>
  insert(row: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder<TData>
  update(patch: Record<string, unknown>): QueryBuilder<TData>
  delete(): QueryBuilder<TData>
}

export interface QueryClient {
  from<TData = unknown>(table: string): QueryBuilder<TData>
}

export type AppSupabaseClient = ReturnType<typeof createServerClient<Database>> | QueryClient

export function queryClient(supabase: AppSupabaseClient): QueryClient {
  return supabase as QueryClient
}
