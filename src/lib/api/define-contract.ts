// defineContract — declarative description of a route's request shape and
// response shape per HTTP method. Centralizes a single source of truth so
// the route module, the client typings, and the contract tests all read
// the same zod schemas.
//
// Contracts describe the *inner* `data` payload of the API envelope, NOT
// the envelope itself. The envelope ({ success, data } | { success, error })
// is applied at runtime by `privateMethod` / `publicMethod`.

import type { z } from 'zod'

export interface ContractMethod<
  Q extends z.ZodTypeAny | undefined,
  B extends z.ZodTypeAny | undefined,
  R extends z.ZodTypeAny,
> {
  query?: Q
  body?: B
  response: R
}

export interface ContractInput<
  M extends Record<
    string,
    ContractMethod<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined, z.ZodTypeAny>
  >,
> {
  path: string
  methods: M
}

export interface Contract<
  M extends Record<
    string,
    ContractMethod<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined, z.ZodTypeAny>
  >,
> {
  path: string
  methods: M
}

// Pass-through identity helper: the only job is to lock in the literal types
// of `path` and `methods` so consumers can write `z.infer<typeof contract.methods.GET.response>`.
export function defineContract<
  M extends Record<
    string,
    ContractMethod<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined, z.ZodTypeAny>
  >,
>(input: ContractInput<M>): Contract<M> {
  return { path: input.path, methods: input.methods }
}
