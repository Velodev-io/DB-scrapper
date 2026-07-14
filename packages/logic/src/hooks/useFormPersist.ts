import { useState, useCallback } from 'react'
import type { KVAdapter } from '../adapters'

export interface FormPersistResult<T> {
  form:   T
  update: (patch: Partial<T>) => void
  clear:  () => void
}

/**
 * createFormPersistHook — factory that binds a KVAdapter to the
 * form draft persistence pattern.
 *
 * Usage:
 *   // Web app (apps/agent):
 *   export const useFormPersist = createFormPersistHook(localStorageAdapter)
 *
 *   // Native app (apps/agent-native):
 *   export const useFormPersist = createFormPersistHook(mmkvAdapter)
 */
export function createFormPersistHook(kv: KVAdapter) {
  return function useFormPersist<T extends object>(
    key: string,
    initial: T
  ): FormPersistResult<T> {
    const [form, setForm] = useState<T>(() => {
      try {
        const saved = kv.get(key)
        if (saved) return { ...initial, ...JSON.parse(saved) }
      } catch {
        // Corrupted storage — start fresh
      }
      return initial
    })

    const update = useCallback((patch: Partial<T>) => {
      setForm(prev => {
        const next = { ...prev, ...patch }
        try { kv.set(key, JSON.stringify(next)) } catch { /* ignore */ }
        return next
      })
    }, [key])

    const clear = useCallback(() => {
      kv.delete(key)
      setForm(initial)
    }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

    return { form, update, clear }
  }
}
