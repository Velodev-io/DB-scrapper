import { createFormPersistHook } from '@carry/logic'
import { sqliteKVAdapter } from '../lib/sqliteKVAdapter'

export const useFormPersist = createFormPersistHook(sqliteKVAdapter)
