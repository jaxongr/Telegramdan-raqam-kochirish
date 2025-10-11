const { query } = require('./sqlite');

// GROUPS
async function getAllGroups() {
  return await query('SELECT * FROM groups ORDER BY created_at DESC');
}

async function getActiveGroups() {
  return await query('SELECT * FROM groups WHERE active = 1 OR active = true');
}

async function getGroupById(id) {
  const rows = await query('SELECT * FROM groups WHERE id = ?', [id]);
  return rows[0];
}

async function getGroupByTelegramId(telegramId) {
  const rows = await query('SELECT * FROM groups WHERE telegram_id = ?', [telegramId]);
  return rows[0];
}

async function createGroup(name, telegramId, keywords = '', smsTemplate = '') {
  const result = await query(
    'INSERT INTO groups (name, telegram_id, keywords, sms_template) VALUES (?, ?, ?, ?)',
    [name, telegramId, keywords, smsTemplate]
  );
  return result.lastID || result.insertId;
}

async function updateGroup(id, data) {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.keywords !== undefined) { fields.push('keywords = ?'); values.push(data.keywords); }
  if (data.sms_template !== undefined) { fields.push('sms_template = ?'); values.push(data.sms_template); }
  if (data.active !== undefined) { fields.push('active = ?'); values.push(data.active ? 1 : 0); }
  if (data.sms_enabled !== undefined) { fields.push('sms_enabled = ?'); values.push(data.sms_enabled ? 1 : 0); }

  values.push(id);
  return await query(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function deleteGroup(id) {
  return await query('DELETE FROM groups WHERE id = ?', [id]);
}

// PHONES
async function getAllPhones(filters = {}) {
  // Bug fix: JSON database uchun JOIN ishlamaydi, alohida query kerak
  let sql = 'SELECT * FROM phones WHERE 1=1';
  const params = [];

  if (filters.group_id) {
    sql += ' AND group_id = ?';
    params.push(filters.group_id);
  }

  if (filters.lifetime_unique !== undefined) {
    sql += ' AND lifetime_unique = ?';
    params.push(filters.lifetime_unique ? 1 : 0);
  }

  sql += ' ORDER BY last_date DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  return await query(sql, params);
}

async function getPhoneByNumber(phone, groupId) {
  const rows = await query('SELECT * FROM phones WHERE phone = ? AND group_id = ?', [phone, groupId]);
  return rows[0];
}

async function savePhone(phone, groupId, messageText = '') {
  const existing = await getPhoneByNumber(phone, groupId);

  if (existing) {
    await query(
      'UPDATE phones SET last_date = CURRENT_TIMESTAMP, repeat_count = repeat_count + 1, last_message = ? WHERE id = ?',
      [messageText.substring(0, 500), existing.id]
    );
    return existing.id;
  } else {
    const now = new Date().toISOString();
    const result = await query(
      'INSERT INTO phones (phone, group_id, first_message, last_message, first_date, last_date, repeat_count, lifetime_unique) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [phone, groupId, messageText.substring(0, 500), messageText.substring(0, 500), now, now, 1, 0]
    );
    return result.lastID || result.insertId;
  }
}

async function markPhoneAsLifetimeUnique(phoneId) {
  return await query('UPDATE phones SET lifetime_unique = 1 WHERE id = ?', [phoneId]);
}

// BATCH SAVE PHONES - skan uchun optimizatsiya
async function savePhonesInBatch(phonesData) {
  const { batchInsertPhones } = require('./sqlite');

  // phonesData format: [{ phone, group_id, message, date }, ...]
  const formattedData = phonesData.map(item => ({
    phone: item.phone,
    group_id: item.group_id,
    first_message: item.message ? item.message.substring(0, 500) : '',
    last_message: item.message ? item.message.substring(0, 500) : '',
    first_date: item.date || new Date().toISOString(),
    last_date: item.date || new Date().toISOString(),
    repeat_count: 1,
    lifetime_unique: 0
  }));

  return batchInsertPhones(formattedData);
}

// SMS LOGS
async function logSMS(toPhone, groupId, message, semysmsPhone, status, error = null) {
  return await query(
    'INSERT INTO sms_logs (to_phone, group_id, message, semysms_phone, status, error) VALUES (?, ?, ?, ?, ?, ?)',
    [toPhone, groupId, message, semysmsPhone, status, error]
  );
}

async function getSMSLogs(filters = {}) {
  // Bug fix: JSON database uchun JOIN ishlamaydi
  let sql = 'SELECT * FROM sms_logs WHERE 1=1';
  const params = [];

  if (filters.group_id) {
    sql += ' AND group_id = ?';
    params.push(filters.group_id);
  }

  if (filters.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.date_from) {
    sql += ' AND sent_at >= ?';
    params.push(filters.date_from);
  }

  sql += ' ORDER BY sent_at DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  return await query(sql, params);
}

async function getSMSCountToday(phone) {
  const today = new Date().toISOString().split('T')[0];
  const rows = await query(
    `SELECT COUNT(*) as count FROM sms_logs WHERE to_phone = ? AND DATE(sent_at) = ?`,
    [phone, today]
  );
  return rows[0].count || rows[0].COUNT || 0;
}

// SEMYSMS PHONES
async function getAllSemySMSPhones() {
  return await query('SELECT * FROM semysms_phones ORDER BY last_used ASC NULLS FIRST, id ASC');
}

async function getActiveSemySMSPhones() {
  return await query('SELECT * FROM semysms_phones WHERE status = ? ORDER BY last_used ASC NULLS FIRST', ['active']);
}

async function getSemySMSPhoneByNumber(phone) {
  const rows = await query('SELECT * FROM semysms_phones WHERE phone = ?', [phone]);
  return rows[0];
}

async function createSemySMSPhone(phone, balance = 0, deviceId = null) {
  const result = await query(
    'INSERT INTO semysms_phones (phone, balance, device_id) VALUES (?, ?, ?)',
    [phone, balance, deviceId]
  );
  return result.lastID || result.insertId;
}

async function updateSemySMSPhone(phone, data) {
  const fields = [];
  const values = [];

  if (data.balance !== undefined) { fields.push('balance = ?'); values.push(data.balance); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.last_used !== undefined) { fields.push('last_used = CURRENT_TIMESTAMP'); }
  if (data.total_sent !== undefined) { fields.push('total_sent = total_sent + 1'); }

  values.push(phone);
  return await query(`UPDATE semysms_phones SET ${fields.join(', ')} WHERE phone = ?`, values);
}

async function deleteSemySMSPhone(phone) {
  return await query('DELETE FROM semysms_phones WHERE phone = ?', [phone]);
}

// SETTINGS
async function getSetting(key) {
  const rows = await query('SELECT value FROM settings WHERE key = ?', [key]);
  return rows[0] ? rows[0].value : null;
}

async function setSetting(key, value) {
  const existing = await getSetting(key);

  if (existing !== null) {
    return await query('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?', [value, key]);
  } else {
    return await query('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

// STATISTICS
async function getStatistics() {
  const stats = {};

  const groupCount = await query('SELECT COUNT(*) as count FROM groups');
  stats.totalGroups = groupCount[0].count || groupCount[0].COUNT || 0;

  const activeGroupCount = await query('SELECT COUNT(*) as count FROM groups WHERE active = 1 OR active = true');
  stats.activeGroups = activeGroupCount[0].count || activeGroupCount[0].COUNT || 0;

  const phoneCount = await query('SELECT COUNT(*) as count FROM phones');
  stats.totalPhones = phoneCount[0].count || phoneCount[0].COUNT || 0;

  const uniquePhoneCount = await query('SELECT COUNT(DISTINCT phone) as count FROM phones');
  stats.uniquePhones = uniquePhoneCount[0].count || uniquePhoneCount[0].COUNT || 0;

  const todaySMS = await query(
    `SELECT COUNT(*) as count FROM sms_logs WHERE DATE(sent_at) = ?`,
    [new Date().toISOString().split('T')[0]]
  );
  stats.smsSentToday = todaySMS[0].count || todaySMS[0].COUNT || 0;

  const totalSMS = await query('SELECT COUNT(*) as count FROM sms_logs');
  stats.totalSMS = totalSMS[0].count || totalSMS[0].COUNT || 0;

  const successSMS = await query('SELECT COUNT(*) as count FROM sms_logs WHERE status = ?', ['success']);
  stats.successSMS = successSMS[0].count || successSMS[0].COUNT || 0;

  return stats;
}

// GROUP STATISTICS - Har bir guruh uchun alohida statistika (OPTIMIZED)
async function getGroupStatistics() {
  try {
    const groups = await getAllGroups();

    // Barcha guruhlarga phone statistikasini bitta query bilan olish
    const phoneStats = await query(`
      SELECT
        group_id,
        COUNT(DISTINCT phone) as unique_phones,
        COUNT(*) as total_phones
      FROM phones
      GROUP BY group_id
    `);

    // Barcha guruhlarga SMS statistikasini bitta query bilan olish
    const smsStats = await query(`
      SELECT
        group_id,
        COUNT(*) as sms_sent,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as sms_success
      FROM sms_logs
      GROUP BY group_id
    `);

    // Map yasash (tez qidirish uchun)
    const phoneStatsMap = {};
    phoneStats.forEach(stat => {
      const groupId = stat.group_id || stat.GROUP_ID;
      phoneStatsMap[groupId] = {
        unique_phones: stat.unique_phones || stat.UNIQUE_PHONES || 0,
        total_phones: stat.total_phones || stat.TOTAL_PHONES || 0
      };
    });

    const smsStatsMap = {};
    smsStats.forEach(stat => {
      const groupId = stat.group_id || stat.GROUP_ID;
      smsStatsMap[groupId] = {
        sms_sent: stat.sms_sent || stat.SMS_SENT || 0,
        sms_success: stat.sms_success || stat.SMS_SUCCESS || 0
      };
    });

    // Guruhlar uchun statistikani tuzish
    const groupStats = groups.map(group => {
      const phoneStat = phoneStatsMap[group.id] || { unique_phones: 0, total_phones: 0 };
      const smsStat = smsStatsMap[group.id] || { sms_sent: 0, sms_success: 0 };

      const successRate = smsStat.sms_sent > 0
        ? ((smsStat.sms_success / smsStat.sms_sent) * 100).toFixed(1)
        : 0;

      return {
        id: group.id,
        name: group.name,
        telegram_id: group.telegram_id,
        active: group.active,
        unique_phones: phoneStat.unique_phones,
        total_phones: phoneStat.total_phones,
        repeat_count: phoneStat.total_phones - phoneStat.unique_phones,
        sms_sent: smsStat.sms_sent,
        sms_success: smsStat.sms_success,
        success_rate: successRate
      };
    });

    // Guruhlarni unique_phones bo'yicha sortlash (ko'pdan kamga)
    groupStats.sort((a, b) => b.unique_phones - a.unique_phones);

    return groupStats;
  } catch (error) {
    console.error('getGroupStatistics error:', error);
    return [];
  }
}

module.exports = {
  // Groups
  getAllGroups,
  getActiveGroups,
  getGroupById,
  getGroupByTelegramId,
  createGroup,
  updateGroup,
  deleteGroup,

  // Phones
  getAllPhones,
  getPhoneByNumber,
  savePhone,
  savePhonesInBatch,
  markPhoneAsLifetimeUnique,

  // SMS Logs
  logSMS,
  getSMSLogs,
  getSMSCountToday,

  // SemySMS Phones
  getAllSemySMSPhones,
  getActiveSemySMSPhones,
  getSemySMSPhoneByNumber,
  createSemySMSPhone,
  updateSemySMSPhone,
  deleteSemySMSPhone,

  // Settings
  getSetting,
  setSetting,

  // Statistics
  getStatistics,
  getGroupStatistics
};
