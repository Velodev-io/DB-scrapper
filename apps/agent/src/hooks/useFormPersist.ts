// Web adapter: binds @carry/logic's useFormPersist factory to localStorage
import { createFormPersistHook } from '@carry/logic/hooks/useFormPersist'
import type { KVAdapter } from '@carry/logic'

const localStorageAdapter: KVAdapter = {
  get:    (key) => localStorage.getItem(key),
  set:    (key, value) => localStorage.setItem(key, value),
  delete: (key) => localStorage.removeItem(key),
}

export const useFormPersist = createFormPersistHook(localStorageAdapter)
export type { FormPersistResult } from '@carry/logic/hooks/useFormPersist'
