const DEFAULT_TIMEOUT_MS = 15_000  // 15 seconds — critical for field agents on slow networks

class ApiError extends Error {
  constructor(public message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string; timeout?: number } = {}
): Promise<T> {
  const { token, timeout = DEFAULT_TIMEOUT_MS, ...init } = options

  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), timeout)

  const base = (import.meta as any).env?.VITE_API_BASE ?? 'http://localhost:4001/api/v1'

  const headers: Record<string, string> = {
    // Only set Content-Type when sending a body — Fastify rejects bodyless
    // DELETE/GET requests that carry Content-Type: application/json with 400.
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init.headers as Record<string, string> ?? {}),
  }

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    })

    clearTimeout(timerId)

    if (!res.ok) {
      const body = (await res.json().catch(() => ({ error: res.statusText }))) as any
      throw new ApiError(body.error ?? 'Request failed', res.status)
    }

    return res.json() as Promise<T>
  } catch (err) {
    clearTimeout(timerId)
    if ((err as Error).name === 'AbortError') {
      throw new ApiError('Request timed out — check your connection', 408)
    }
    throw err
  }
}

export const api = {
  get: <T>(path: string, token?: string) =>
    request<T>(path, { method: 'GET', token }),

  post: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), token }),

  patch: <T>(path: string, body: unknown, token: string) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body), token }),

  delete: <T>(path: string, token: string) =>
    request<T>(path, { method: 'DELETE', token }),
}

export { ApiError }
