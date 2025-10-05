const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../data/logistics.db');
const dbDir = path.dirname(dbPath);

// Directory yaratish
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

/**
 * Database initialization
 */
function initLogisticsDatabase() {
  console.log('🚛 Logistics database ishga tushirilmoqda...');

  // Yukchi raqamlar (umrboqiy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS yukchi_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      telegram_id INTEGER,
      username TEXT,
      first_name TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      announcement_count INTEGER DEFAULT 1
    )
  `);

  // Dispecher raqamlar (umrboqiy)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dispecher_phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      telegram_id INTEGER,
      username TEXT,
      first_name TEXT,
      company_name TEXT,
      first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      announcement_count INTEGER DEFAULT 1
    )
  `);

  // E'lonlar
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER,
      category TEXT NOT NULL,
      user_telegram_id INTEGER,
      username TEXT,
      first_name TEXT,
      phone TEXT,
      raw_text TEXT NOT NULL,
      formatted_text TEXT NOT NULL,
      classification_score INTEGER,
      classification_details TEXT,
      taken_by_user_id INTEGER,
      taken_at DATETIME,
      posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_group_id INTEGER,
      source_group_name TEXT,
      is_duplicate BOOLEAN DEFAULT 0,
      admin_verified BOOLEAN DEFAULT 0,
      admin_corrected_category TEXT
    )
  `);

  // User classifications (learning database)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_classifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      category TEXT NOT NULL,
      classification_score INTEGER,
      admin_verified BOOLEAN DEFAULT 0,
      verified_by_admin_id INTEGER,
      verified_at DATETIME,
      correction_count INTEGER DEFAULT 0,
      groups_count INTEGER DEFAULT 0,
      daily_posts_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Bot subscribers (foydalanuvchilar)
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      phone TEXT,
      status TEXT DEFAULT 'trial',
      trial_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      trial_end DATETIME,
      subscription_start DATETIME,
      subscription_end DATETIME,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL,
      payment_method TEXT,
      screenshot_path TEXT,
      status TEXT DEFAULT 'pending',
      admin_approved BOOLEAN DEFAULT 0,
      approved_by_admin_id INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES subscribers(id)
    )
  `);

  // Admin corrections (learning)
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      user_telegram_id INTEGER NOT NULL,
      old_category TEXT NOT NULL,
      new_category TEXT NOT NULL,
      admin_id INTEGER NOT NULL,
      corrected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id)
    )
  `);

  // Duplicate tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS duplicate_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text_hash TEXT NOT NULL,
      phone TEXT,
      user_telegram_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_announcements_user ON announcements(user_telegram_id);
    CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
    CREATE INDEX IF NOT EXISTS idx_announcements_posted ON announcements(posted_at);
    CREATE INDEX IF NOT EXISTS idx_subscribers_telegram_id ON subscribers(telegram_id);
    CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
    CREATE INDEX IF NOT EXISTS idx_duplicate_cache_hash ON duplicate_cache(text_hash);
    CREATE INDEX IF NOT EXISTS idx_duplicate_cache_created ON duplicate_cache(created_at);
    CREATE INDEX IF NOT EXISTS idx_user_classifications_telegram_id ON user_classifications(telegram_id);
  `);

  console.log('✅ Logistics database tayyor!');
}

/**
 * Yukchi raqam qo'shish yoki yangilash
 */
function addOrUpdateYukchiPhone(phone, telegramId, username, firstName) {
  const stmt = db.prepare(`
    INSERT INTO yukchi_phones (phone, telegram_id, username, first_name, announcement_count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(phone) DO UPDATE SET
      last_seen = CURRENT_TIMESTAMP,
      announcement_count = announcement_count + 1,
      telegram_id = COALESCE(excluded.telegram_id, telegram_id),
      username = COALESCE(excluded.username, username),
      first_name = COALESCE(excluded.first_name, first_name)
  `);
  return stmt.run(phone, telegramId, username, firstName);
}

/**
 * Dispecher raqam qo'shish yoki yangilash
 */
function addOrUpdateDispecherPhone(phone, telegramId, username, firstName, companyName = null) {
  const stmt = db.prepare(`
    INSERT INTO dispecher_phones (phone, telegram_id, username, first_name, company_name, announcement_count)
    VALUES (?, ?, ?, ?, ?, 1)
    ON CONFLICT(phone) DO UPDATE SET
      last_seen = CURRENT_TIMESTAMP,
      announcement_count = announcement_count + 1,
      telegram_id = COALESCE(excluded.telegram_id, telegram_id),
      username = COALESCE(excluded.username, username),
      first_name = COALESCE(excluded.first_name, first_name),
      company_name = COALESCE(excluded.company_name, company_name)
  `);
  return stmt.run(phone, telegramId, username, firstName, companyName);
}

/**
 * E'lon saqlash
 */
function saveAnnouncement(data) {
  const stmt = db.prepare(`
    INSERT INTO announcements (
      message_id, category, user_telegram_id, username, first_name,
      phone, raw_text, formatted_text, classification_score,
      classification_details, source_group_id, source_group_name, is_duplicate
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return stmt.run(
    data.messageId,
    data.category,
    data.userTelegramId,
    data.username,
    data.firstName,
    data.phone,
    data.rawText,
    data.formattedText,
    data.classificationScore,
    JSON.stringify(data.classificationDetails),
    data.sourceGroupId,
    data.sourceGroupName,
    data.isDuplicate ? 1 : 0
  );
}

/**
 * Raqam olinganini belgilash
 */
function markPhoneTaken(announcementId, userId) {
  const stmt = db.prepare(`
    UPDATE announcements
    SET taken_by_user_id = ?, taken_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  return stmt.run(userId, announcementId);
}

/**
 * Raqam olingan-olinmaganini tekshirish
 */
function isPhoneTaken(announcementId) {
  const stmt = db.prepare('SELECT taken_by_user_id FROM announcements WHERE id = ?');
  const result = stmt.get(announcementId);
  return result && result.taken_by_user_id !== null;
}

/**
 * User classification saqlash/yangilash
 */
function saveUserClassification(telegramId, username, firstName, category, score, details) {
  const stmt = db.prepare(`
    INSERT INTO user_classifications (
      telegram_id, username, first_name, category, classification_score,
      groups_count, daily_posts_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      category = excluded.category,
      classification_score = excluded.classification_score,
      groups_count = excluded.groups_count,
      daily_posts_count = excluded.daily_posts_count,
      last_updated = CURRENT_TIMESTAMP
  `);

  return stmt.run(
    telegramId,
    username,
    firstName,
    category,
    score,
    details.groupsCount || 0,
    details.dailyPostsCount || 0
  );
}

/**
 * User classification olish
 */
function getUserClassification(telegramId) {
  const stmt = db.prepare('SELECT * FROM user_classifications WHERE telegram_id = ?');
  return stmt.get(telegramId);
}

/**
 * Admin correction saqlash
 */
function saveAdminCorrection(announcementId, userTelegramId, oldCategory, newCategory, adminId) {
  const stmt = db.prepare(`
    INSERT INTO admin_corrections (
      announcement_id, user_telegram_id, old_category, new_category, admin_id
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const result = stmt.run(announcementId, userTelegramId, oldCategory, newCategory, adminId);

  // E'lonni yangilash
  const updateStmt = db.prepare(`
    UPDATE announcements
    SET admin_verified = 1, admin_corrected_category = ?
    WHERE id = ?
  `);
  updateStmt.run(newCategory, announcementId);

  // User classification yangilash
  const userStmt = db.prepare(`
    UPDATE user_classifications
    SET category = ?, admin_verified = 1, verified_by_admin_id = ?,
        verified_at = CURRENT_TIMESTAMP, correction_count = correction_count + 1
    WHERE telegram_id = ?
  `);
  userStmt.run(newCategory, adminId, userTelegramId);

  return result;
}

/**
 * Subscriber qo'shish
 */
function addSubscriber(telegramId, username, firstName, phone = null) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 3); // 3 kun trial

  const stmt = db.prepare(`
    INSERT INTO subscribers (telegram_id, username, first_name, phone, trial_end)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      last_active = CURRENT_TIMESTAMP
  `);

  return stmt.run(telegramId, username, firstName, phone, trialEnd.toISOString());
}

/**
 * Subscriber olish
 */
function getSubscriber(telegramId) {
  const stmt = db.prepare('SELECT * FROM subscribers WHERE telegram_id = ?');
  return stmt.get(telegramId);
}

/**
 * Subscriber statusini yangilash
 */
function updateSubscriberStatus(telegramId, status, subscriptionEnd = null) {
  const stmt = db.prepare(`
    UPDATE subscribers
    SET status = ?, subscription_end = ?, last_active = CURRENT_TIMESTAMP
    WHERE telegram_id = ?
  `);
  return stmt.run(status, subscriptionEnd, telegramId);
}

/**
 * To'lov qo'shish
 */
function addPayment(userId, amount, period, screenshotPath) {
  const stmt = db.prepare(`
    INSERT INTO payments (user_id, amount, period, screenshot_path)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(userId, amount, period, screenshotPath);
}

/**
 * To'lovni tasdiqlash
 */
function approvePayment(paymentId, adminId, subscriptionEnd) {
  const stmt = db.prepare(`
    UPDATE payments
    SET status = 'approved', admin_approved = 1, approved_by_admin_id = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const result = stmt.run(adminId, paymentId);

  // Subscriber'ni yangilash
  const payment = db.prepare('SELECT user_id, period FROM payments WHERE id = ?').get(paymentId);
  if (payment) {
    const subscriber = db.prepare('SELECT telegram_id FROM subscribers WHERE id = ?').get(payment.user_id);
    if (subscriber) {
      updateSubscriberStatus(subscriber.telegram_id, 'active', subscriptionEnd);
    }
  }

  return result;
}

/**
 * Dublikat tekshirish (1 soat ichida)
 */
function isDuplicate(textHash, phone) {
  // Eski duplicate cache'larni o'chirish (1 soatdan eski)
  db.prepare(`
    DELETE FROM duplicate_cache
    WHERE created_at < datetime('now', '-1 hour')
  `).run();

  // Dublikat tekshirish
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM duplicate_cache
    WHERE text_hash = ? OR phone = ?
  `);

  const result = stmt.get(textHash, phone);
  return result.count > 0;
}

/**
 * Dublikat cache'ga qo'shish
 */
function addToDuplicateCache(textHash, phone, userTelegramId) {
  const stmt = db.prepare(`
    INSERT INTO duplicate_cache (text_hash, phone, user_telegram_id)
    VALUES (?, ?, ?)
  `);
  return stmt.run(textHash, phone, userTelegramId);
}

/**
 * Statistika
 */
function getStats() {
  const yukchiCount = db.prepare('SELECT COUNT(*) as count FROM yukchi_phones').get().count;
  const dispecherCount = db.prepare('SELECT COUNT(*) as count FROM dispecher_phones').get().count;
  const announcementsCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get().count;
  const subscribersCount = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
  const activeSubscribers = db.prepare('SELECT COUNT(*) as count FROM subscribers WHERE status = "active" OR status = "trial"').get().count;

  return {
    yukchiCount,
    dispecherCount,
    announcementsCount,
    subscribersCount,
    activeSubscribers
  };
}

/**
 * Pending to'lovlar
 */
function getPendingPayments() {
  const stmt = db.prepare(`
    SELECT p.*, s.telegram_id, s.username, s.first_name
    FROM payments p
    JOIN subscribers s ON p.user_id = s.id
    WHERE p.status = 'pending'
    ORDER BY p.created_at DESC
  `);
  return stmt.all();
}

module.exports = {
  initLogisticsDatabase,
  addOrUpdateYukchiPhone,
  addOrUpdateDispecherPhone,
  saveAnnouncement,
  markPhoneTaken,
  isPhoneTaken,
  saveUserClassification,
  getUserClassification,
  saveAdminCorrection,
  addSubscriber,
  getSubscriber,
  updateSubscriberStatus,
  addPayment,
  approvePayment,
  isDuplicate,
  addToDuplicateCache,
  getStats,
  getPendingPayments
};
