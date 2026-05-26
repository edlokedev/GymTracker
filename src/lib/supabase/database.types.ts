// Placeholder Supabase Database type.
//
// The real shape is generated from the live database via:
//   supabase gen types typescript --linked > src/lib/supabase/database.types.ts
//
// Until that runs, we expose a *permissive* Database shape so the typed
// `SupabaseClient<Database>` can still be used with `.from('any_table')` calls
// without the table-name parameter collapsing to `never`. Rows/Inserts are
// typed as loose records; the real generated types will narrow them.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type PermissiveTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: []
}

export interface Database {
  public: {
    Tables: { [key: string]: PermissiveTable }
    Views: { [key: string]: PermissiveTable }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
