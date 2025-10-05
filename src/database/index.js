const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = {
  groups: [],
  phones: [],
  sms_logs: [],
  semysms_phones: [],
  settings: []
};

const dbPath = path.join(__dirname, '../../data/database.json');

// Database ni yuklash
async function initDatabase() {
  try {
    const dbDir = path.dirname(dbPath);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      try {
        const data = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(data);

        // Validate structure
        if (parsed && typeof parsed === 'object') {
          db = {
            groups: Array.isArray(parsed.groups) ? parsed.groups : [],
            phones: Array.isArray(parsed.phones) ? parsed.phones : [],
            sms_logs: Array.isArray(parsed.sms_logs) ? parsed.sms_logs : [],
            semysms_phones: Array.isArray(parsed.semysms_phones) ? parsed.semysms_phones : [],
            settings: Array.isArray(parsed.settings) ? parsed.settings : []
          };
        } else {
          console.warn('Invalid database structure, reinitializing...');
          saveDatabase();
        }
      } catch (parseError) {
        console.error('Database parse error, creating new:', parseError.message);
        saveDatabase();
      }
    } else {
      saveDatabase();
    }

    console.log('✓ Database initialized (JSON)');
    return db;
  } catch (error) {
    console.error('Database init error:', error);
    throw error;
  }
}

// Database ni saqlash
function saveDatabase() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Database save error:', error);
  }
}

// Query wrapper (simplified for JSON)
async function query(sql, params = []) {
  // Simple implementation for common queries
  const sqlUpper = sql.trim().toUpperCase();

  // COUNT queries (COUNT(*) yoki COUNT(DISTINCT ...))
  if (sqlUpper.includes('COUNT(') && (sqlUpper.includes('COUNT(*)') || sqlUpper.includes('COUNT(DISTINCT'))) {
    if (sqlUpper.includes('FROM GROUPS')) {
      const count = sqlUpper.includes('WHERE ACTIVE')
        ? db.groups.filter(g => g.active).length
        : db.groups.length;
      return [{ count }];
    }
    if (sqlUpper.includes('FROM PHONES')) {
      if (sqlUpper.includes('DISTINCT')) {
        const uniquePhones = new Set(db.phones.map(p => p.phone));
        return [{ count: uniquePhones.size }];
      }
      return [{ count: db.phones.length }];
    }
    if (sqlUpper.includes('FROM SMS_LOGS')) {
      let filtered = db.sms_logs;
      if (sqlUpper.includes("WHERE STATUS = ?")) {
        filtered = filtered.filter(s => s.status === params[0]);
      }
      if (sqlUpper.includes('WHERE DATE(SENT_AT)')) {
        const today = new Date().toISOString().split('T')[0];
        filtered = filtered.filter(s => s.sent_at && s.sent_at.split('T')[0] === today);
      }
      return [{ count: filtered.length }];
    }
    if (sqlUpper.includes('FROM SEMYSMS_PHONES')) {
      return [{ count: db.semysms_phones.length }];
    }
  }

  if (sqlUpper.startsWith('SELECT * FROM GROUPS')) {
    if (sqlUpper.includes('WHERE ACTIVE')) {
      return db.groups.filter(g => g.active);
    }
    if (sqlUpper.includes('WHERE ID')) {
      return db.groups.filter(g => g.id == params[0]);
    }
    if (sqlUpper.includes('WHERE TELEGRAM_ID')) {
      return db.groups.filter(g => g.telegram_id === params[0]);
    }
    return db.groups;
  }

  if (sqlUpper.startsWith('SELECT * FROM PHONES') || sqlUpper.startsWith('SELECT FROM PHONES')) {
    let result = [...db.phones];
    let paramIndex = 0;

    // WHERE shartlari
    if (sqlUpper.includes('WHERE PHONE') && sqlUpper.includes('AND GROUP_ID')) {
      result = result.filter(p => p.phone === params[0] && p.group_id == params[1]);
    } else if (sqlUpper.includes('WHERE 1=1')) {
      // Dinamik WHERE shartlar
      if (sqlUpper.includes('AND GROUP_ID')) {
        result = result.filter(p => p.group_id == params[paramIndex]);
        paramIndex++;
      }
      if (sqlUpper.includes('AND LIFETIME_UNIQUE')) {
        result = result.filter(p => p.lifetime_unique == params[paramIndex]);
        paramIndex++;
      }
    } else if (sqlUpper.includes('WHERE GROUP_ID')) {
      result = result.filter(p => p.group_id == params[0]);
    } else if (sqlUpper.includes('WHERE LIFETIME_UNIQUE')) {
      result = result.filter(p => p.lifetime_unique == params[0]);
    }

    // ORDER BY
    if (sqlUpper.includes('ORDER BY')) {
      result = result.sort((a, b) => {
        const dateA = new Date(a.last_date || 0);
        const dateB = new Date(b.last_date || 0);
        return dateB - dateA;
      });
    }

    // LIMIT
    if (sqlUpper.includes('LIMIT')) {
      const limit = parseInt(params[params.length - 1]);
      if (!isNaN(limit)) {
        result = result.slice(0, limit);
      }
    }

    return result;
  }

  if (sqlUpper.startsWith('SELECT * FROM SMS_LOGS')) {
    let result = db.sms_logs;
    let paramIndex = 0;

    if (sqlUpper.includes('WHERE TO_PHONE') && sqlUpper.includes('DATE(SENT_AT)')) {
      const today = new Date().toISOString().split('T')[0];
      result = result.filter(s => s.to_phone === params[0] && s.sent_at && s.sent_at.split('T')[0] === today);
    } else if (sqlUpper.includes('WHERE TO_PHONE') && sqlUpper.includes('AND STATUS')) {
      // Cooldown uchun: WHERE to_phone = ? AND status = ?
      result = result.filter(s => s.to_phone === params[0] && s.status === params[1]);
    } else {
      // Boshqa WHERE shartlari
      if (sqlUpper.includes('WHERE GROUP_ID')) {
        result = result.filter(s => s.group_id == params[paramIndex]);
        paramIndex++;
      }
      if (sqlUpper.includes('AND STATUS')) {
        result = result.filter(s => s.status === params[paramIndex]);
        paramIndex++;
      }
      if (sqlUpper.includes('AND SENT_AT >=')) {
        result = result.filter(s => s.sent_at >= params[paramIndex]);
        paramIndex++;
      }
    }

    if (sqlUpper.includes('ORDER BY')) {
      result = [...result].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    }
    if (sqlUpper.includes('LIMIT')) {
      // Extract LIMIT value from SQL (can be hardcoded or parameterized)
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        const limit = parseInt(limitMatch[1]);
        result = result.slice(0, limit);
      } else {
        // Fallback: try using last parameter
        const limit = params[params.length - 1];
        if (typeof limit === 'number') {
          result = result.slice(0, limit);
        }
      }
    }
    return result;
  }

  if (sqlUpper.startsWith('SELECT * FROM SEMYSMS_PHONES')) {
    if (sqlUpper.includes("WHERE STATUS = ?")) {
      return db.semysms_phones.filter(p => p.status === params[0]);
    }
    if (sqlUpper.includes('WHERE PHONE = ?')) {
      return db.semysms_phones.filter(p => p.phone === params[0]);
    }
    if (sqlUpper.includes('ORDER BY LAST_USED')) {
      return [...db.semysms_phones].sort((a, b) => {
        if (!a.last_used) return -1;
        if (!b.last_used) return 1;
        return new Date(a.last_used) - new Date(b.last_used);
      });
    }
    return db.semysms_phones;
  }

  if (sqlUpper.startsWith('SELECT * FROM SETTINGS')) {
    if (sqlUpper.includes('WHERE KEY')) {
      return db.settings.filter(s => s.key === params[0]);
    }
    return db.settings;
  }

  if (sqlUpper.startsWith('INSERT INTO GROUPS')) {
    const newGroup = {
      id: db.groups.length + 1,
      name: params[0],
      telegram_id: params[1],
      keywords: params[2] || '',
      sms_template: params[3] || '',
      active: 1,
      sms_enabled: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.groups.push(newGroup);
    saveDatabase();
    return { lastID: newGroup.id };
  }

  if (sqlUpper.startsWith('INSERT INTO PHONES')) {
    const newPhone = {
      id: db.phones.length + 1,
      phone: params[0],
      group_id: params[1],
      first_date: new Date().toISOString(),
      last_date: new Date().toISOString(),
      repeat_count: 1,
      lifetime_unique: 0,
      first_message: params[2] || '',
      last_message: params[2] || ''
    };
    db.phones.push(newPhone);
    saveDatabase();
    return { lastID: newPhone.id };
  }

  if (sqlUpper.startsWith('INSERT INTO SMS_LOGS')) {
    const newLog = {
      id: db.sms_logs.length + 1,
      to_phone: params[0],
      group_id: params[1],
      message: params[2],
      semysms_phone: params[3],
      status: params[4],
      error: params[5],
      sent_at: new Date().toISOString()
    };
    db.sms_logs.push(newLog);
    saveDatabase();
    return { lastID: newLog.id };
  }

  if (sqlUpper.startsWith('INSERT INTO SEMYSMS_PHONES')) {
    const newSemySMS = {
      id: db.semysms_phones.length + 1,
      phone: params[0],
      balance: params[1] || 0,
      device_id: params[2] || null, // SemySMS device ID
      status: 'active',
      last_used: null,
      total_sent: 0,
      created_at: new Date().toISOString()
    };
    db.semysms_phones.push(newSemySMS);
    saveDatabase();
    return { lastID: newSemySMS.id };
  }

  // UPDATE queries
  if (sqlUpper.startsWith('UPDATE GROUPS')) {
    const id = params[params.length - 1];
    const groupIndex = db.groups.findIndex(g => g.id == id);
    if (groupIndex !== -1) {
      // Parse SET values
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      if (setMatch) {
        const sets = setMatch[1].split(',').map(s => s.trim());
        let paramIdx = 0;
        sets.forEach(set => {
          const [field] = set.split('=').map(s => s.trim());
          if (field === 'name') db.groups[groupIndex].name = params[paramIdx++];
          if (field === 'keywords') db.groups[groupIndex].keywords = params[paramIdx++];
          if (field === 'sms_template') db.groups[groupIndex].sms_template = params[paramIdx++];
          if (field === 'active') db.groups[groupIndex].active = params[paramIdx++];
          if (field === 'sms_enabled') db.groups[groupIndex].sms_enabled = params[paramIdx++];
        });
        db.groups[groupIndex].updated_at = new Date().toISOString();
      }
    }
    saveDatabase();
    return { changes: 1 };
  }

  if (sqlUpper.startsWith('UPDATE PHONES')) {
    const id = params[params.length - 1];
    const phoneIndex = db.phones.findIndex(p => p.id == id);
    if (phoneIndex !== -1) {
      if (sqlUpper.includes('LIFETIME_UNIQUE')) {
        db.phones[phoneIndex].lifetime_unique = 1;
      }
      if (sqlUpper.includes('LAST_DATE') && sqlUpper.includes('REPEAT_COUNT')) {
        db.phones[phoneIndex].last_date = new Date().toISOString();
        db.phones[phoneIndex].repeat_count++;
        if (sqlUpper.includes('LAST_MESSAGE')) {
          db.phones[phoneIndex].last_message = params[0] || '';
        }
      }
    }
    saveDatabase();
    return { changes: 1 };
  }

  if (sqlUpper.startsWith('UPDATE SEMYSMS_PHONES')) {
    const phone = params[params.length - 1];
    const phoneIndex = db.semysms_phones.findIndex(p => p.phone === phone);
    if (phoneIndex !== -1) {
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      if (setMatch) {
        const sets = setMatch[1].split(',').map(s => s.trim());
        let paramIdx = 0;
        sets.forEach(set => {
          const [field] = set.split('=').map(s => s.trim());
          if (field === 'balance') db.semysms_phones[phoneIndex].balance = params[paramIdx++];
          if (field === 'status') db.semysms_phones[phoneIndex].status = params[paramIdx++];
          if (field === 'last_used' && set.includes('CURRENT_TIMESTAMP')) {
            db.semysms_phones[phoneIndex].last_used = new Date().toISOString();
          }
          if (field === 'total_sent' && set.includes('total_sent + 1')) {
            db.semysms_phones[phoneIndex].total_sent++;
          }
        });
      }
    }
    saveDatabase();
    return { changes: 1 };
  }

  if (sqlUpper.startsWith('UPDATE SETTINGS')) {
    const key = params[params.length - 1];
    const settingIndex = db.settings.findIndex(s => s.key === key);
    if (settingIndex !== -1) {
      db.settings[settingIndex].value = params[0];
      db.settings[settingIndex].updated_at = new Date().toISOString();
    }
    saveDatabase();
    return { changes: 1 };
  }

  // DELETE queries
  if (sqlUpper.startsWith('DELETE FROM GROUPS')) {
    db.groups = db.groups.filter(g => g.id != params[0]);
    saveDatabase();
    return { changes: 1 };
  }

  if (sqlUpper.startsWith('DELETE FROM SEMYSMS_PHONES')) {
    db.semysms_phones = db.semysms_phones.filter(p => p.phone !== params[0]);
    saveDatabase();
    return { changes: 1 };
  }

  return [];
}

module.exports = {
  initDatabase,
  query,
  getDB: () => db
};
