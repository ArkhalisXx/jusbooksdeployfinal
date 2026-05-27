/**
 * db.js — SQLite driver shim
 *
 * Replaces the `sqlite3` native addon (which requires GLIBC 2.38) with
 * `better-sqlite3`, which ships its own statically-linked SQLite and works
 * on any Railway / Ubuntu environment without GLIBC version issues.
 *
 * The exported object mimics the sqlite3 `Database` callback API used by
 * adapter.js:  db.run(), db.get(), db.all()
 * so adapter.js requires zero changes.
 */

const Database = require('better-sqlite3');
const path     = require('path');

const dbPath = path.join(__dirname, 'jusbooks.db');

let _db;
try {
  _db = new Database(dbPath);
  _db.pragma('foreign_keys = ON');
  _db.pragma('journal_mode = WAL');   // better concurrent read performance
  console.log('Connected to SQLite database (better-sqlite3).');
} catch (err) {
  console.error('Database connection failed:', err.message);
  process.exit(1);
}

// ── Shim: wrap synchronous better-sqlite3 in the async callback style ─────────

const db = {
  /**
   * db.run(sql, params, callback)
   * callback(err) — `this` has .lastID and .changes
   */
  run(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    try {
      const stmt   = _db.prepare(sql);
      const info   = stmt.run(params);
      const ctx    = { lastID: info.lastInsertRowid, changes: info.changes };
      if (callback) callback.call(ctx, null);
    } catch (err) {
      if (callback) callback.call({}, err);
    }
  },

  /**
   * db.get(sql, params, callback)
   * callback(err, row)
   */
  get(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    try {
      const row = _db.prepare(sql).get(params);
      if (callback) callback(null, row ?? null);
    } catch (err) {
      if (callback) callback(err, null);
    }
  },

  /**
   * db.all(sql, params, callback)
   * callback(err, rows)
   */
  all(sql, params = [], callback) {
    if (typeof params === 'function') { callback = params; params = []; }
    try {
      const rows = _db.prepare(sql).all(params);
      if (callback) callback(null, rows);
    } catch (err) {
      if (callback) callback(err, []);
    }
  },
};

module.exports = db;
