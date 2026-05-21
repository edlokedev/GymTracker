export interface ApiResult<T> {
  success?: boolean
  data?: T
  error?: string
}

type SearchParamScalar = string | number | boolean | null | undefined
type SearchParamValue = SearchParamScalar | readonly SearchParamScalar[]

interface ReadApiDataOptions<T> {
  fallbackData?: T
}

function errorMessageFromResult(result: ApiResult<unknown> | null, fallbackError: string): string {
  return result?.error || fallbackError
}

async function readApiJson<T>(response: Response): Promise<ApiResult<T> | null> {
  try {
    return (await response.json()) as ApiResult<T>
  } catch {
    return null
  }
}

export async function readApiResult<T>(
  response: Response,
  fallbackError: string,
): Promise<ApiResult<T>> {
  const result = await readApiJson<T>(response)

  if (!response.ok || result?.success === false) {
    throw new Error(errorMessageFromResult(result, fallbackError))
  }

  return result ?? {}
}

export async function readApiData<T>(
  response: Response,
  fallbackError: string,
  options: ReadApiDataOptions<T> = {},
): Promise<T> {
  const result = await readApiResult<T>(response, fallbackError)

  if (result.data !== undefined) {
    return result.data
  }

  if (options.fallbackData !== undefined) {
    return options.fallbackData
  }

  throw new Error(result.error || fallbackError)
}

export async function readApiSuccess(response: Response, fallbackError: string): Promise<void> {
  await readApiResult<unknown>(response, fallbackError)
}

export function buildSearchParams(params: Record<string, SearchParamValue>): URLSearchParams {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value]

    values.forEach((item) => {
      if (item === null || item === undefined || item === '') return
      searchParams.append(key, String(item))
    })
  })

  return searchParams
}
