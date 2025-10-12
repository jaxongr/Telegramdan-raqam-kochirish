/**
 * Qora ro'yxat (Blacklist) database operations
 *
 * Qora ro'yxatda turgan raqamlarga SMS yuborilmaydi.
 * Sabablari:
 * - Shikoyat qilgan
 * - Konkurrent
 * - Spam
 * - Bloklangan
 */

const { query } = require('./sqlite');
const logger = require('../utils/logger');

/**
 * Qora ro'yxatga raqam qo'shish
 */
async function addToBlacklist(phone, reason = 'manual', notes = null) {
  try {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      return { success: false, error: 'invalid_phone' };
    }

    const exists = await query('SELECT id FROM blacklist WHERE phone = ?', [cleanPhone]);
    if (exists.length > 0) {
      logger.warn(`Raqam allaqachon qora ro'yxatda: ${cleanPhone}`);
      return { success: false, error: 'already_in_blacklist' };
    }

    const reasonText = notes ? `${reason} - ${notes}` : reason;
    await query('INSERT INTO blacklist (phone, reason) VALUES (?, ?)', [cleanPhone, reasonText]);
    logger.info(`✅ Qora ro'yxatga qo'shildi: ${cleanPhone} (${reasonText})`);
    return { success: true, phone: cleanPhone };
  } catch (error) {
    logger.error('Qora ro\'yxatga qo\'shishda xato:', error);
    throw error;
  }
}

/**
 * Qora ro'yxatdan o'chirish
 */
async function removeFromBlacklist(id) {
  try {
    const item = await query('SELECT phone FROM blacklist WHERE id = ?', [id]);
    if (item.length === 0) {
      logger.warn(`Qora ro'yxatda topilmadi: ID ${id}`);
      return { success: false, error: 'not_found' };
    }
    await query('DELETE FROM blacklist WHERE id = ?', [id]);
    logger.info(`✅ Qora ro'yxatdan o'chirildi: ${item[0].phone}`);
    return { success: true, phone: item[0].phone };
  } catch (error) {
    logger.error('Qora ro\'yxatdan o\'chirishda xato:', error);
    throw error;
  }
}

/**
 * Raqam qora ro'yxatda ekanligini tekshirish
 */
async function isBlacklisted(phone) {
  try {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const rows = await query('SELECT 1 FROM blacklist WHERE phone = ? LIMIT 1', [cleanPhone]);
    return rows.length > 0;
  } catch (error) {
    logger.error('Qora ro\'yxat tekshirishda xato:', error);
    return false; // Xato bo'lsa, ruxsat beramiz (false = not blacklisted)
  }
}

/**
 * Barcha qora ro'yxat raqamlarini olish
 */
async function getAllBlacklist(limit = 1000, offset = 0) {
  try {
    const rows = await query(
      'SELECT * FROM blacklist ORDER BY added_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return rows;
  } catch (error) {
    logger.error('Qora ro\'yxatni olishda xato:', error);
    throw error;
  }
}

/**
 * Qora ro'yxat statistikasi
 */
async function getBlacklistStats() {
  try {
    const total = (await query('SELECT COUNT(*) as c FROM blacklist'))[0].c || 0;
    const rows = await query('SELECT reason, COUNT(*) as count FROM blacklist GROUP BY reason ORDER BY count DESC');
    const byReason = rows.map(r => ({ reason: r.reason || 'unknown', count: r.count || r.COUNT || 0 }));
    return { total, byReason };
  } catch (error) {
    logger.error('Qora ro\'yxat statistikasida xato:', error);
    throw error;
  }
}

/**
 * Qora ro'yxatni qidirish
 */
async function searchBlacklist(searchQuery) {
  try {
    const q = `%${(searchQuery || '').toLowerCase()}%`;
    const rows = await query(
      'SELECT * FROM blacklist WHERE LOWER(phone) LIKE ? OR LOWER(reason) LIKE ? ORDER BY added_at DESC LIMIT 100',
      [q, q]
    );
    return rows;
  } catch (error) {
    logger.error('Qora ro\'yxat qidirishda xato:', error);
    throw error;
  }
}

module.exports = {
  addToBlacklist,
  removeFromBlacklist,
  isBlacklisted,
  getAllBlacklist,
  getBlacklistStats,
  searchBlacklist
};
