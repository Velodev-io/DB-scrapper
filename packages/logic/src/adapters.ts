// ── StorageAdapter ────────────────────────────────────────────────────────────
// Implemented per-platform:
//   Web (apps/agent):          IndexedDB via idb
//   Native (apps/agent-native): expo-sqlite

export interface StorageAdapter {
  save(key: string, data: unknown[], total: number): Promise<void>
  load(key: string): Promise<{ data: unknown[]; total: number; cachedAt: number } | null>
}

// ── KVAdapter ─────────────────────────────────────────────────────────────────
// Implemented per-platform:
//   Web (apps/agent):          localStorage
//   Native (apps/agent-native): react-native-mmkv

export interface KVAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  delete(key: string): void
}
