import * as SQLite from 'expo-sqlite'

const db = SQLite.openDatabaseSync('carry.db')

/**
 * initDatabase — run on app startup (in _layout.tsx).
 * Creates all tables with IF NOT EXISTS — safe to call on every launch.
 */
export function initDatabase(): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS read_cache (
      key       TEXT    PRIMARY KEY,
      data      TEXT    NOT NULL,
      total     INTEGER NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_uploads (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id   TEXT    NOT NULL UNIQUE,
      model      TEXT    NOT NULL,
      record_id  TEXT    NOT NULL,
      field_name TEXT    NOT NULL,
      file_uri   TEXT    NOT NULL,
      file_name  TEXT    NOT NULL,
      folder     TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
      attempts   INTEGER NOT NULL DEFAULT 0,
      public_id  TEXT                          -- set after successful Cloudinary upload
    );

    CREATE TABLE IF NOT EXISTS pending_records (
      id         TEXT    PRIMARY KEY,
      type       TEXT    NOT NULL,
      payload    TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    );

    CREATE TABLE IF NOT EXISTS kv_store (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export { db }
