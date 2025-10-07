const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = path.join(__dirname, '../../data/database.sqlite');
let db = null;

// Database ni ochish
function openDatabase() {
  if (db) return db;

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  return db;
}

// Database schema yaratish
function initDatabase() {
  const db = openDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      telegram_id TEXT NOT NULL UNIQUE,
      keywords TEXT DEFAULT '',
      sms_template TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      first_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      repeat_count INTEGER DEFAULT 1,
      lifetime_unique INTEGER DEFAULT 0,
      first_message TEXT DEFAULT '',
      last_message TEXT DEFAULT '',
      FOREIGN KEY (group_id) REFERENCES groups(id),
      UNIQUE(phone, group_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_phone TEXT NOT NULL,
      group_id INTEGER,
      message TEXT NOT NULL,
      semysms_phone TEXT,
      status TEXT NOT NULL,
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS semysms_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      balance REAL DEFAULT 0,
      device_id TEXT,
      status TEXT DEFAULT 'active',
      last_used DATETIME,
      total_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      reason TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_phones_group ON phones(group_id);
    CREATE INDEX IF NOT EXISTS idx_phones_phone ON phones(phone);
    CREATE INDEX IF NOT EXISTS idx_phones_lifetime_unique ON phones(lifetime_unique);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_group ON sms_logs(group_id);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_logs(to_phone);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_date ON sms_logs(sent_at);
    CREATE INDEX IF NOT EXISTS idx_semysms_status ON semysms_phones(status);
    CREATE INDEX IF NOT EXISTS idx_semysms_last_used ON semysms_phones(last_used);
  `);

  console.log('✓ SQLite database initialized:', dbPath);
  return db;
}

// Query wrapper
async function query(sql, params = []) {
  const db = openDatabase();

  try {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    }

    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { lastID: result.lastInsertRowid, insertId: result.lastInsertRowid };
    }

    if (sql.trim().toUpperCase().startsWith('UPDATE')) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { changes: result.changes };
    }

    if (sql.trim().toUpperCase().startsWith('DELETE')) {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return { changes: result.changes };
    }

    db.exec(sql);
    return [];
  } catch (error) {
    console.error('SQLite query error:', error.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw error;
  }
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

function backupDatabase(backupPath) {
  const db = openDatabase();
  const backup = db.backup(backupPath);
  backup.step(-1);
  backup.finish();
  console.log('✓ Backup created:', backupPath);
}

// BATCH INSERT - skan uchun optimizatsiya (TRANSACTION bilan)
function batchInsertPhones(phonesData) {
  const db = openDatabase();

  // Prepared statement - faqat 1 marta tayyorlanadi
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO phones (phone, group_id, first_message, last_message, first_date, last_date, repeat_count, lifetime_unique)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateStmt = db.prepare(`
    UPDATE phones
    SET last_date = ?, repeat_count = repeat_count + 1, last_message = ?
    WHERE phone = ? AND group_id = ?
  `);

  // TRANSACTION - hammasi bir martalik!
  const insertMany = db.transaction((phones) => {
    let inserted = 0;
    let updated = 0;

    for (const phoneData of phones) {
      const result = insertStmt.run(
        phoneData.phone,
        phoneData.group_id,
        phoneData.first_message || '',
        phoneData.last_message || '',
        phoneData.first_date || new Date().toISOString(),
        phoneData.last_date || new Date().toISOString(),
        phoneData.repeat_count || 1,
        phoneData.lifetime_unique || 0
      );

      if (result.changes > 0) {
        inserted++;
      } else {
        // Agar INSERT ishlamasa (UNIQUE constraint), UPDATE qil
        updateStmt.run(
          phoneData.last_date || new Date().toISOString(),
          phoneData.last_message || '',
          phoneData.phone,
          phoneData.group_id
        );
        updated++;
      }
    }

    return { inserted, updated };
  });

  return insertMany(phonesData);
}

// BATCH INSERT - SMS logs uchun
function batchInsertSMSLogs(logsData) {
  const db = openDatabase();

  const insertStmt = db.prepare(`
    INSERT INTO sms_logs (to_phone, group_id, message, semysms_phone, status, error, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((logs) => {
    let inserted = 0;
    for (const log of logs) {
      insertStmt.run(
        log.to_phone,
        log.group_id,
        log.message,
        log.semysms_phone || null,
        log.status,
        log.error || null,
        log.sent_at || new Date().toISOString()
      );
      inserted++;
    }
    return { inserted };
  });

  return insertMany(logsData);
}

function initBroadcastDatabase() {
  console.log('✓ Broadcast database (JSON) initialized');
  return null;
}

module.exports = {
  initDatabase,
  query,
  getDB: () => db,
  getDatabase: () => db,
  closeDatabase,
  backupDatabase,
  batchInsertPhones,
  batchInsertSMSLogs,
  initBroadcastDatabase
};
