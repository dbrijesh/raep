import Database from 'better-sqlite3';
import path from 'path';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    // DB_PATH is resolved lazily so that process.env.DB_PATH can be set by tests
    // before the first connection is created (e.g. ':memory:' for unit tests).
    const dbPath = process.env.DB_PATH ?? path.join(__dirname, '../../data/todos.db');
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

/** Close and reset the singleton. Used in tests to get a fresh in-memory DB per test. */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
