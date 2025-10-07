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

const { getDatabase, saveDatabase } = require('./index');
const logger = require('../utils/logger');

/**
 * Qora ro'yxatga raqam qo'shish
 */
async function addToBlacklist(phone, reason = 'manual', notes = null) {
  try {
    const db = getDatabase();

    // Phone formatting - faqat raqamlar
    const cleanPhone = phone.replace(/\D/g, '');

    // Avval mavjudligini tekshirish
    const existing = db.blacklist.find(b => b.phone === cleanPhone);

    if (existing) {
      logger.warn(`Raqam allaqachon qora ro'yxatda: ${cleanPhone}`);
      return { success: false, error: 'already_in_blacklist' };
    }

    // Qo'shish
    const newEntry = {
      id: Date.now(), // Unique ID
      phone: cleanPhone,
      reason: reason,
      notes: notes,
      created_at: new Date().toISOString()
    };

    db.blacklist.push(newEntry);
    saveDatabase();

    logger.info(`✅ Qora ro'yxatga qo'shildi: ${cleanPhone} (${reason})`);

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
    const db = getDatabase();

    const index = db.blacklist.findIndex(b => b.id === parseInt(id));

    if (index === -1) {
      logger.warn(`Qora ro'yxatda topilmadi: ID ${id}`);
      return { success: false, error: 'not_found' };
    }

    const phone = db.blacklist[index].phone;
    db.blacklist.splice(index, 1);
    saveDatabase();

    logger.info(`✅ Qora ro'yxatdan o'chirildi: ${phone}`);

    return { success: true, phone };
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
    const db = getDatabase();
    const cleanPhone = phone.replace(/\D/g, '');

    return db.blacklist.some(b => b.phone === cleanPhone);
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
    const db = getDatabase();

    // created_at bo'yicha tartiblash (yangilar birinchi)
    const sorted = [...db.blacklist].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    // Pagination
    return sorted.slice(offset, offset + limit);
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
    const db = getDatabase();

    const total = db.blacklist.length;

    // Reason bo'yicha guruhlash
    const reasonCounts = {};
    db.blacklist.forEach(b => {
      const reason = b.reason || 'unknown';
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });

    const byReason = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      byReason
    };
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
    const db = getDatabase();

    const query = searchQuery.toLowerCase();

    const results = db.blacklist.filter(b =>
      b.phone.includes(query) ||
      (b.notes && b.notes.toLowerCase().includes(query)) ||
      (b.reason && b.reason.toLowerCase().includes(query))
    );

    // created_at bo'yicha tartiblash
    return results.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    ).slice(0, 100);
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
