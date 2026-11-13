const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');

function normalizeSql(sql) {
  return String(sql || '')
    .replace(/date\(['"]now['"]\)/gi, 'CURRENT_DATE')
    .replace(/datetime\(['"]now['"]\)/gi, 'CURRENT_TIMESTAMP')
    .replace(/strftime\(['"]/gi, '');
}

class SqliteAdapter {
  constructor(filePath) {
    this.db = new sqlite3.Database(filePath);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, function onAll(err, rows) {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, function onGet(err, row) {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

class PostgresAdapter {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async run(sql, params = []) {
    const normalized = normalizeSql(sql);
    if (/^\s*PRAGMA\b/i.test(normalized)) return { id: null, changes: 0 };
    const result = await this.pool.query(normalized, params);
    const idValue = result.rows && result.rows[0] && 'id' in result.rows[0] ? result.rows[0].id : null;
    return { id: idValue, changes: result.rowCount || 0 };
  }

  async all(sql, params = []) {
    const normalized = normalizeSql(sql);
    if (/^\s*PRAGMA\b/i.test(normalized)) return [];
    const result = await this.pool.query(normalized, params);
    return result.rows || [];
  }

  async get(sql, params = []) {
    const normalized = normalizeSql(sql);
    if (/^\s*PRAGMA\b/i.test(normalized)) return null;
    const result = await this.pool.query(normalized, params);
    return result.rows && result.rows.length ? result.rows[0] : null;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = function createDatabase() {
  if (process.env.DATABASE_URL) {
    return new PostgresAdapter(process.env.DATABASE_URL);
  }
  return new SqliteAdapter(process.env.DB_PATH || require('path').join(__dirname, '..', 'mkulima.db'));
};
