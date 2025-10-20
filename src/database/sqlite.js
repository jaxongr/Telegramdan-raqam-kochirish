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

// Open DB immediately so exported `db` is usable by dependents
openDatabase();

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

  // Routes (for routeSmsService)
  db.exec(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      from_keywords TEXT NOT NULL,
      to_keywords TEXT NOT NULL,
      from_region TEXT,
      to_region TEXT,
      use_region_matching INTEGER DEFAULT 0,
      sms_template TEXT,
      time_window_minutes INTEGER DEFAULT 120,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS route_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      to_phone TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )
  `);

  // Yo'nalish bo'yicha topilgan e'lonlar (REAL-TIME)
  db.exec(`
    CREATE TABLE IF NOT EXISTS route_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      message_text TEXT NOT NULL,
      phone_numbers TEXT,
      message_date DATETIME NOT NULL,
      sms_sent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
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
    CREATE INDEX IF NOT EXISTS idx_route_logs_sent ON route_sms_logs(sent_at);
    CREATE INDEX IF NOT EXISTS idx_route_messages_route ON route_messages(route_id);
    CREATE INDEX IF NOT EXISTS idx_route_messages_date ON route_messages(message_date);
  `);

  // Migration: Add 'error' column to route_sms_logs if it doesn't exist
  try {
    const tableInfo = db.prepare('PRAGMA table_info(route_sms_logs)').all();
    const hasErrorColumn = tableInfo.some(col => col.name === 'error');

    if (!hasErrorColumn) {
      console.log('🔧 Migration: Adding "error" column to route_sms_logs...');
      db.exec('ALTER TABLE route_sms_logs ADD COLUMN error TEXT');
      console.log('✓ Migration completed: error column added');
    }
  } catch (migrationError) {
    console.error('Migration error:', migrationError);
  }

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

// Broadcast tables and helpers
function initBroadcastDatabase() {
  const db = openDatabase();

  // Telegram accounts used for broadcasting
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      session_string TEXT,
      api_id TEXT,
      api_hash TEXT,
      status TEXT DEFAULT 'active',
      assigned_groups_count INTEGER DEFAULT 0,
      total_messages_sent INTEGER DEFAULT 0,
      last_message_time DATETIME,
      wait_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Groups for broadcast distribution
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      username TEXT,
      assigned_account_id INTEGER,
      last_broadcast_time DATETIME,
      total_broadcasts INTEGER DEFAULT 0,
      permission TEXT DEFAULT 'allowed',
      permission_reason TEXT,
      permission_until DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_account_id) REFERENCES telegram_accounts(id)
    )
  `);

  // Broadcast messages
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_groups INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    )
  `);

  // Broadcast logs (per group)
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      account_id INTEGER,
      status TEXT NOT NULL,
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES broadcast_messages(id),
      FOREIGN KEY (group_id) REFERENCES broadcast_groups(id),
      FOREIGN KEY (account_id) REFERENCES telegram_accounts(id)
    )
  `);

  // Useful indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bm_status ON broadcast_messages(status);
    CREATE INDEX IF NOT EXISTS idx_bl_message ON broadcast_logs(message_id);
    CREATE INDEX IF NOT EXISTS idx_bg_assigned ON broadcast_groups(assigned_account_id);
  `);

  console.log('✓ Broadcast database initialized');
  return db;
}

// Broadcast helpers used by services
function getActiveAccounts() {
  const rows = db.prepare(`SELECT * FROM telegram_accounts WHERE status = 'active'`).all();
  return rows;
}

function getAccountById(id) {
  return db.prepare(`SELECT * FROM telegram_accounts WHERE id = ?`).get(id);
}

function updateAccountStatus(id, status, waitUntil = null) {
  const stmt = db.prepare(`UPDATE telegram_accounts SET status = ?, wait_until = ? WHERE id = ?`);
  return stmt.run(status, waitUntil, id);
}

function upsertBroadcastGroup(telegramId, title, username = null) {
  const existing = db.prepare(`SELECT id FROM broadcast_groups WHERE telegram_id = ?`).get(telegramId);
  if (existing) {
    return db.prepare(`UPDATE broadcast_groups SET title = ?, username = ? WHERE id = ?`).run(title, username, existing.id);
  }
  return db.prepare(`INSERT INTO broadcast_groups (telegram_id, title, username) VALUES (?, ?, ?)`)
    .run(telegramId, title, username);
}

function assignGroupToAccount(groupId, accountId) {
  return db.prepare(`UPDATE broadcast_groups SET assigned_account_id = ? WHERE id = ?`).run(accountId, groupId);
}

function getUnassignedGroups() {
  return db.prepare(`SELECT * FROM broadcast_groups WHERE assigned_account_id IS NULL`).all();
}

function createBroadcastMessage(messageText) {
  return db.prepare(`INSERT INTO broadcast_messages (message_text, status, created_at) VALUES (?, 'pending', CURRENT_TIMESTAMP)`).run(messageText);
}

function updateBroadcastStatus(messageId, status, sentCount = 0, failedCount = 0) {
  return db.prepare(`UPDATE broadcast_messages SET status = ?, sent_count = ?, failed_count = ? WHERE id = ?`)
    .run(status, sentCount, failedCount, messageId);
}

function addBroadcastLog(messageId, groupId, accountId, status, error = null) {
  return db.prepare(`INSERT INTO broadcast_logs (message_id, group_id, account_id, status, error, sent_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`) 
    .run(messageId, groupId, accountId || null, status, error || null);
}

function getAllGroups() {
  // Broadcast groups list
  return db.prepare(`SELECT * FROM broadcast_groups ORDER BY created_at DESC`).all();
}

function getBroadcastStats() {
  const totalGroups = db.prepare(`SELECT COUNT(*) AS c FROM broadcast_groups`).get().c;
  const assignedGroups = db.prepare(`SELECT COUNT(*) AS c FROM broadcast_groups WHERE assigned_account_id IS NOT NULL`).get().c;
  const totalAccounts = db.prepare(`SELECT COUNT(*) AS c FROM telegram_accounts`).get().c;
  const activeAccounts = db.prepare(`SELECT COUNT(*) AS c FROM telegram_accounts WHERE status = 'active'`).get().c;
  return { totalGroups, assignedGroups, unassignedGroups: totalGroups - assignedGroups, totalAccounts, activeAccounts };
}

function getAccountStats() {
  return db.prepare(`SELECT id, phone, status, assigned_groups_count, total_messages_sent, last_message_time FROM telegram_accounts ORDER BY id DESC`).all();
}

function canSendToGroup(groupId) {
  const g = db.prepare(`SELECT permission, permission_reason, permission_until FROM broadcast_groups WHERE id = ?`).get(groupId);
  if (!g) return { allowed: false, reason: 'group_not_found' };
  if (g.permission === 'denied') {
    return { allowed: false, reason: g.permission_reason || 'denied' };
  }
  if (g.permission_until) {
    const until = new Date(g.permission_until).getTime();
    if (Date.now() < until) {
      return { allowed: false, reason: 'temporary_denied' };
    }
  }
  return { allowed: true, reason: null };
}

function updateGroupPermission(groupId, permission, reason = null, until = null) {
  return db.prepare(`UPDATE broadcast_groups SET permission = ?, permission_reason = ?, permission_until = ? WHERE id = ?`)
    .run(permission, reason, until, groupId);
}

function isMessageSentToGroup(messageId, groupId) {
  const row = db.prepare(`SELECT 1 FROM broadcast_logs WHERE message_id = ? AND group_id = ? AND status = 'sent' LIMIT 1`).get(messageId, groupId);
  return !!row;
}

module.exports = {
  initDatabase,
  query,
  getDB: () => db,
  getDatabase: () => db,
  db,
  closeDatabase,
  backupDatabase,
  batchInsertPhones,
  batchInsertSMSLogs,
  initBroadcastDatabase,
  // Broadcast helpers
  getActiveAccounts,
  getAccountById,
  updateAccountStatus,
  upsertBroadcastGroup,
  assignGroupToAccount,
  getUnassignedGroups,
  createBroadcastMessage,
  updateBroadcastStatus,
  addBroadcastLog,
  getAllGroups,
  getBroadcastStats,
  getAccountStats,
  canSendToGroup,
  updateGroupPermission,
  isMessageSentToGroup
};
