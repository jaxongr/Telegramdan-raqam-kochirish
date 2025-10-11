const { query, getDatabase } = require('./sqlite');

// ==================== CRUD OPERATIONS ====================

async function getAllRoutes() {
  return await query('SELECT * FROM routes ORDER BY created_at DESC');
}

async function getActiveRoutes() {
  return await query('SELECT * FROM routes WHERE active = 1 ORDER BY name ASC');
}

async function getRouteById(id) {
  const rows = await query('SELECT * FROM routes WHERE id = ?', [id]);
  return rows[0];
}

async function createRoute(name, fromKeywords, toKeywords, smsTemplate, timeWindow = 120) {
  const result = await query(
    'INSERT INTO routes (name, from_keywords, to_keywords, sms_template, time_window_minutes) VALUES (?, ?, ?, ?, ?)',
    [name, fromKeywords, toKeywords, smsTemplate, timeWindow]
  );
  return result.lastID || result.insertId;
}

async function updateRoute(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.from_keywords !== undefined) { fields.push('from_keywords = ?'); values.push(data.from_keywords); }
  if (data.to_keywords !== undefined) { fields.push('to_keywords = ?'); values.push(data.to_keywords); }
  if (data.sms_template !== undefined) { fields.push('sms_template = ?'); values.push(data.sms_template); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }
  if (data.time_window_minutes !== undefined) { fields.push('time_window_minutes = ?'); values.push(data.time_window_minutes); }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const sql = 'UPDATE routes SET ' + fields.join(', ') + ' WHERE id = ?';
  return await query(sql, values);
}

async function deleteRoute(id) {
  return await query('DELETE FROM routes WHERE id = ?', [id]);
}

// ==================== SMS LOGS ====================

async function logRouteSMS(routeId, toPhone, message, status = 'success') {
  return await query(
    'INSERT INTO route_sms_logs (route_id, to_phone, message, status) VALUES (?, ?, ?, ?)',
    [routeId, toPhone, message, status]
  );
}

async function getRouteSMSLogs(routeId = null, limit = 100) {
  if (routeId) {
    return await query(
      'SELECT * FROM route_sms_logs WHERE route_id = ? ORDER BY sent_at DESC LIMIT ?',
      [routeId, limit]
    );
  }
  return await query('SELECT * FROM route_sms_logs ORDER BY sent_at DESC LIMIT ?', [limit]);
}

// ==================== KEYWORD MATCHING ====================

/**
 * Yo'nalish bo'yicha telefon raqamlarni topish
 * @param {number} routeId - Route ID
 * @param {number} timeWindowMinutes - Vaqt oralig'i (daqiqada)
 * @returns {Promise<Array>} - Topilgan telefon raqamlar
 */
async function findMatchingPhones(routeId, timeWindowMinutes = 120) {
  const route = await getRouteById(routeId);
  if (!route) return [];

  // Kalit so'zlarni ajratish
  const fromKeywords = route.from_keywords.toLowerCase().split(',').map(k => k.trim());
  const toKeywords = route.to_keywords.toLowerCase().split(',').map(k => k.trim());

  // Vaqt oralig'ini hisoblash
  const cutoffTime = new Date(Date.now() - parseInt(timeWindowMinutes) * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);

  // Barcha telefonlarni olish (oxirgi N daqiqada)
  const phones = await query(
    'SELECT DISTINCT p.phone, p.last_message, p.last_date, g.name as group_name FROM phones p JOIN groups g ON p.group_id = g.id WHERE p.last_date >= ? ORDER BY p.last_date DESC',
    [cutoffTime]
  );

  // Filtratsiya: faqat yo'nalishga mos keluvchilar
  const matchedPhones = phones.filter(phoneRecord => {
    const message = (phoneRecord.last_message || '').toLowerCase();
    return matchesRoute(message, fromKeywords, toKeywords);
  });

  return matchedPhones;
}

/**
 * Xabar yo'nalishga mos keladimi?
 * @param {string} message - Xabar matni
 * @param {Array<string>} fromKeywords - "Dan" kalit so'zlar
 * @param {Array<string>} toKeywords - "Ga" kalit so'zlar
 * @returns {boolean}
 */
function matchesRoute(message, fromKeywords, toKeywords) {
  const messageLower = message.toLowerCase();

  // FROM location + aniqlovchi (dan/дан)
  const fromMatched = fromKeywords.some(keyword => {
    // Regex: keyword + optional space + (dan/дан) + word boundary
    const patterns = [
      new RegExp('\\b' + escapeRegex(keyword) + '\\s*(dan|дан)\\b', 'i'),
      new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i') // Aniqlovchisiz ham qabul qilish
    ];
    return patterns.some(pattern => pattern.test(messageLower));
  });

  // TO location + aniqlovchi (ga/ка/га)
  const toMatched = toKeywords.some(keyword => {
    const patterns = [
      new RegExp('\\b' + escapeRegex(keyword) + '\\s*(ga|га|ка)\\b', 'i'),
      new RegExp('\\b' + escapeRegex(keyword) + '\\b', 'i')
    ];
    return patterns.some(pattern => pattern.test(messageLower));
  });

  // YANGI: FROM yoki TO bo'lsa ham qabul qilamiz (ko'proq e'lon topish uchun)
  // Agar ikkala yo'nalish ham bo'lsa - ideal
  // Agar faqat FROM yoki faqat TO bo'lsa ham - qabul qilamiz
  
  if (fromMatched && toMatched) {
    return true; // Ideal: ikkala yo'nalish ham bor
  }
  
  if (fromMatched || toMatched) {
    return true; // Yaxshi: kamida bittasi bor
  }
  
  return false; // Hech narsa mos kelmadi
}

/**
 * Regex uchun maxsus belgilarni escape qilish
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== STATISTICS ====================

async function getRouteStatistics(routeId) {
  const totalSent = await query(
    'SELECT COUNT(*) as count FROM route_sms_logs WHERE route_id = ?',
    [routeId]
  );

  const successSent = await query(
    'SELECT COUNT(*) as count FROM route_sms_logs WHERE route_id = ? AND status = ?',
    [routeId, 'success']
  );

  return {
    total: totalSent[0].count || totalSent[0].COUNT || 0,
    success: successSent[0].count || successSent[0].COUNT || 0
  };
}

// ==================== 2-HOUR LIMIT CHECK ====================

/**
 * 2 soat ichida SMS yuborilgan bo'lsa true qaytaradi
 * @param {number} routeId - Route ID
 * @param {string} phone - Telefon raqam
 * @returns {Promise<boolean>}
 */
async function wasSmsSentRecently(routeId, phone) {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const result = await query(
    'SELECT COUNT(*) as count FROM route_sms_logs WHERE route_id = ? AND to_phone = ? AND sent_at >= ?',
    [routeId, phone, twoHoursAgo]
  );

  return (result[0].count || result[0].COUNT || 0) > 0;
}

// ==================== E'LONLARNI TOPISH (DEBUG) ====================

/**
 * Yo'nalish bo'yicha mos keluvchi e'lonlarni topish (telefon raqam bilan)
 * @param {number} routeId - Route ID
 * @param {number} timeWindowMinutes - Vaqt oralig'i (daqiqada)
 * @returns {Promise<Array>} - Topilgan e'lonlar (message, group, date, phones)
 */
async function findMatchingMessages(routeId, timeWindowMinutes = 120) {
  const route = await getRouteById(routeId);
  if (!route) return [];

  // Kalit so'zlarni ajratish
  const fromKeywords = route.from_keywords.toLowerCase().split(',').map(k => k.trim());
  const toKeywords = route.to_keywords.toLowerCase().split(',').map(k => k.trim());

  // Vaqt oralig'ini hisoblash
  const cutoffTime = new Date(Date.now() - parseInt(timeWindowMinutes) * 60 * 1000).toISOString().replace("T", " ").substring(0, 19);
  // BARCHA guruhlardagi telefonlarni olish (monitoring = 1 shart YO'Q!)
  const phones = await query(
    'SELECT p.phone, p.last_message, p.last_date, g.name as group_name, g.id as group_id FROM phones p JOIN groups g ON p.group_id = g.id WHERE p.last_date >= ? ORDER BY p.last_date DESC',
    [cutoffTime]
  );

  // Filtratsiya va guruhlar bo'yicha gruppalash
  const matchedMessages = [];
  const seenMessages = new Set();

  phones.forEach(phoneRecord => {
    const message = (phoneRecord.last_message || '').toLowerCase();

    if (matchesRoute(message, fromKeywords, toKeywords)) {
      // Dublikat xabarlarni o'tkazib yuborish
      const messageKey = phoneRecord.group_id + '|' + phoneRecord.last_message;
      if (seenMessages.has(messageKey)) return;
      seenMessages.add(messageKey);

      matchedMessages.push({
        message: phoneRecord.last_message,
        group_name: phoneRecord.group_name,
        group_id: phoneRecord.group_id,
        date: phoneRecord.last_date,
        phones: []
      });
    }
  });

  // Har bir xabarga telefon raqamlarni biriktirish
  phones.forEach(phoneRecord => {
    const message = (phoneRecord.last_message || '').toLowerCase();

    if (matchesRoute(message, fromKeywords, toKeywords)) {
      const matchedMsg = matchedMessages.find(
        m => m.group_id === phoneRecord.group_id && m.message === phoneRecord.last_message
      );

      if (matchedMsg && !matchedMsg.phones.includes(phoneRecord.phone)) {
        matchedMsg.phones.push(phoneRecord.phone);
      }
    }
  });

  return matchedMessages;
}

// ==================== EXPORTS ====================

module.exports = {
  getAllRoutes,
  getActiveRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  logRouteSMS,
  getRouteSMSLogs,
  findMatchingPhones,
  matchesRoute,
  getRouteStatistics,
  wasSmsSentRecently,
  findMatchingMessages
};
