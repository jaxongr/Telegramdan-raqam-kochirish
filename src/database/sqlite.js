const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/broadcast.db');
const dbDir = path.dirname(dbPath);

// Directory yaratish
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// SQLite database
const db = new Database(dbPath);

// WAL mode (better performance)
db.pragma('journal_mode = WAL');

/**
 * Database jadvallarini yaratish
 */
function initBroadcastDatabase() {
  console.log('📊 Broadcast database (SQLite) ishga tushirilmoqda...');

  // 1. Telegram Accounts - Ko'p akkauntlar
  db.exec(`
    CREATE TABLE IF NOT EXISTS telegram_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      session_string TEXT NOT NULL,
      api_id TEXT NOT NULL,
      api_hash TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      assigned_groups_count INTEGER DEFAULT 0,
      total_messages_sent INTEGER DEFAULT 0,
      last_message_time TEXT,
      flood_wait_until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Broadcast Groups - Barcha guruhlar
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id TEXT UNIQUE NOT NULL,
      title TEXT,
      username TEXT,
      assigned_account_id INTEGER,
      last_broadcast_time TEXT,
      total_broadcasts INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_account_id) REFERENCES telegram_accounts(id)
    )
  `);

  // Index for faster lookups
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_telegram_id ON broadcast_groups(telegram_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_group_assigned_account ON broadcast_groups(assigned_account_id)`);

  // 3. Broadcast Messages - Yuborilgan habarlar
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_text TEXT NOT NULL,
      scheduled_time TEXT,
      status TEXT DEFAULT 'pending',
      total_groups INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      started_at TEXT,
      completed_at TEXT
    )
  `);

  // 4. Broadcast Logs - Har bir guruhga yuborilgan habar logi
  db.exec(`
    CREATE TABLE IF NOT EXISTS broadcast_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      error TEXT,
      sent_at TEXT,
      FOREIGN KEY (message_id) REFERENCES broadcast_messages(id),
      FOREIGN KEY (group_id) REFERENCES broadcast_groups(id),
      FOREIGN KEY (account_id) REFERENCES telegram_accounts(id)
    )
  `);

  // Index for logs
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_message ON broadcast_logs(message_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_status ON broadcast_logs(status)`);

  // 5. Account Sessions - QR code login uchun temporary storage
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_logins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT,
      qr_code TEXT,
      login_token TEXT,
      status TEXT DEFAULT 'waiting',
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✓ Broadcast database tayyor (SQLite)');
}

/**
 * Telegram akkaunt qo'shish
 */
function addTelegramAccount(phone, sessionString, apiId, apiHash) {
  const stmt = db.prepare(`
    INSERT INTO telegram_accounts (phone, session_string, api_id, api_hash, status)
    VALUES (?, ?, ?, ?, 'active')
  `);

  return stmt.run(phone, sessionString, apiId, apiHash);
}

/**
 * Barcha aktiv akkauntlarni olish
 */
function getActiveAccounts() {
  const stmt = db.prepare(`
    SELECT * FROM telegram_accounts
    WHERE status = 'active'
    ORDER BY assigned_groups_count ASC
  `);

  return stmt.all();
}

/**
 * Akkaunt ma'lumotlarini olish
 */
function getAccountById(id) {
  const stmt = db.prepare('SELECT * FROM telegram_accounts WHERE id = ?');
  return stmt.get(id);
}

/**
 * Akkaunt statusini yangilash
 */
function updateAccountStatus(id, status, floodWaitUntil = null) {
  const stmt = db.prepare(`
    UPDATE telegram_accounts
    SET status = ?, flood_wait_until = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  return stmt.run(status, floodWaitUntil, id);
}

/**
 * Guruh qo'shish yoki yangilash
 */
function upsertBroadcastGroup(telegramId, title, username = null) {
  const stmt = db.prepare(`
    INSERT INTO broadcast_groups (telegram_id, title, username)
    VALUES (?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      title = excluded.title,
      username = excluded.username
  `);

  return stmt.run(telegramId, title, username);
}

/**
 * Guruhga akkaunt tayinlash
 */
function assignGroupToAccount(groupId, accountId) {
  const stmt = db.prepare(`
    UPDATE broadcast_groups
    SET assigned_account_id = ?
    WHERE id = ?
  `);

  return stmt.run(accountId, groupId);
}

/**
 * Barcha guruhlarni olish
 */
function getAllGroups() {
  const stmt = db.prepare(`
    SELECT bg.*, ta.phone as assigned_phone
    FROM broadcast_groups bg
    LEFT JOIN telegram_accounts ta ON bg.assigned_account_id = ta.id
    ORDER BY bg.id
  `);

  return stmt.all();
}

/**
 * Akkauntning guruhlarini olish
 */
function getGroupsByAccount(accountId) {
  const stmt = db.prepare(`
    SELECT * FROM broadcast_groups
    WHERE assigned_account_id = ?
  `);

  return stmt.all(accountId);
}

/**
 * Tayinlanmagan guruhlarni olish
 */
function getUnassignedGroups() {
  const stmt = db.prepare(`
    SELECT * FROM broadcast_groups
    WHERE assigned_account_id IS NULL
  `);

  return stmt.all();
}

/**
 * Broadcast message yaratish
 */
function createBroadcastMessage(messageText, scheduledTime = null) {
  const stmt = db.prepare(`
    INSERT INTO broadcast_messages (message_text, scheduled_time, status)
    VALUES (?, ?, 'pending')
  `);

  return stmt.run(messageText, scheduledTime);
}

/**
 * Broadcast message statusini yangilash
 */
function updateBroadcastStatus(messageId, status, sentCount = null, failedCount = null) {
  let sql = 'UPDATE broadcast_messages SET status = ?, updated_at = CURRENT_TIMESTAMP';
  const params = [status];

  if (sentCount !== null) {
    sql += ', sent_count = ?';
    params.push(sentCount);
  }

  if (failedCount !== null) {
    sql += ', failed_count = ?';
    params.push(failedCount);
  }

  sql += ' WHERE id = ?';
  params.push(messageId);

  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

/**
 * Broadcast log qo'shish
 */
function addBroadcastLog(messageId, groupId, accountId, status, error = null) {
  const stmt = db.prepare(`
    INSERT INTO broadcast_logs (message_id, group_id, account_id, status, error, sent_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  return stmt.run(messageId, groupId, accountId, status, error);
}

/**
 * Statistika
 */
function getBroadcastStats() {
  const accountsStmt = db.prepare("SELECT COUNT(*) as count FROM telegram_accounts WHERE status = 'active'");
  const groupsStmt = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups');
  const messagesStmt = db.prepare('SELECT COUNT(*) as count FROM broadcast_messages');
  const assignedStmt = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups WHERE assigned_account_id IS NOT NULL');

  return {
    totalAccounts: accountsStmt.get().count,
    totalGroups: groupsStmt.get().count,
    totalMessages: messagesStmt.get().count,
    assignedGroups: assignedStmt.get().count
  };
}

/**
 * Akkaunt statistikasini olish
 */
function getAccountStats() {
  const stmt = db.prepare(`
    SELECT
      ta.id,
      ta.phone,
      ta.status,
      ta.assigned_groups_count,
      ta.total_messages_sent,
      ta.last_message_time,
      COUNT(bg.id) as actual_groups_count
    FROM telegram_accounts ta
    LEFT JOIN broadcast_groups bg ON ta.id = bg.assigned_account_id
    GROUP BY ta.id
    ORDER BY ta.id
  `);

  return stmt.all();
}

/**
 * Database yopish
 */
function closeDatabase() {
  db.close();
}

module.exports = {
  initBroadcastDatabase,
  addTelegramAccount,
  getActiveAccounts,
  getAccountById,
  updateAccountStatus,
  upsertBroadcastGroup,
  assignGroupToAccount,
  getAllGroups,
  getGroupsByAccount,
  getUnassignedGroups,
  createBroadcastMessage,
  updateBroadcastStatus,
  addBroadcastLog,
  getBroadcastStats,
  getAccountStats,
  closeDatabase,
  db // Raw database access
};
