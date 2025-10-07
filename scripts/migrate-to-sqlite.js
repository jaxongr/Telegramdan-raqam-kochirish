const fs = require('fs');
const path = require('path');
const { initDatabase, query } = require('../src/database/sqlite');

console.log('=== JSON to SQLite Migration ===\n');

// JSON database ni o'qish
const jsonPath = path.join(__dirname, '../data/database.json');

if (!fs.existsSync(jsonPath)) {
  console.error('❌ database.json topilmadi!');
  process.exit(1);
}

const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
console.log('✓ JSON database o\'qildi');
console.log(`  Groups: ${jsonData.groups?.length || 0}`);
console.log(`  Phones: ${jsonData.phones?.length || 0}`);
console.log(`  SMS Logs: ${jsonData.sms_logs?.length || 0}`);
console.log(`  SemySMS Phones: ${jsonData.semysms_phones?.length || 0}`);
console.log(`  Settings: ${jsonData.settings?.length || 0}`);
console.log(`  Blacklist: ${jsonData.blacklist?.length || 0}\n`);

// SQLite database ni boshlash
initDatabase();
console.log('✓ SQLite database initialized\n');

// Groups ni ko'chirish
console.log('📦 Groups ko\'chirilmoqda...');
let groupsCount = 0;
for (const group of jsonData.groups || []) {
  try {
    await query(
      'INSERT OR IGNORE INTO groups (id, name, telegram_id, keywords, sms_template, active, sms_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        group.id,
        group.name,
        group.telegram_id,
        group.keywords || '',
        group.sms_template || '',
        group.active ? 1 : 0,
        group.sms_enabled ? 1 : 0,
        group.created_at || new Date().toISOString(),
        group.updated_at || new Date().toISOString()
      ]
    );
    groupsCount++;
  } catch (error) {
    console.error(`  ❌ Xato (group ${group.id}):`, error.message);
  }
}
console.log(`✓ ${groupsCount} ta guruh ko'chirildi\n`);

// Phones ni ko'chirish (batch insert - tezroq)
console.log('📱 Phones ko\'chirilmoqda (batch mode)...');
let phonesCount = 0;
const BATCH_SIZE = 1000;

for (let i = 0; i < (jsonData.phones || []).length; i += BATCH_SIZE) {
  const batch = jsonData.phones.slice(i, i + BATCH_SIZE);
  
  for (const phone of batch) {
    try {
      await query(
        'INSERT OR IGNORE INTO phones (id, phone, group_id, first_date, last_date, repeat_count, lifetime_unique, first_message, last_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          phone.id,
          phone.phone,
          phone.group_id,
          phone.first_date || new Date().toISOString(),
          phone.last_date || new Date().toISOString(),
          phone.repeat_count || 1,
          phone.lifetime_unique ? 1 : 0,
          phone.first_message || '',
          phone.last_message || ''
        ]
      );
      phonesCount++;
    } catch (error) {
      console.error(`  ❌ Xato (phone ${phone.id}):`, error.message);
    }
  }
  
  if (phonesCount % 1000 === 0) {
    console.log(`  ${phonesCount} ta telefon ko'chirildi...`);
  }
}
console.log(`✓ ${phonesCount} ta telefon ko'chirildi\n`);

// SMS logs ni ko'chirish
console.log('📨 SMS logs ko\'chirilmoqda...');
let smsCount = 0;
for (let i = 0; i < (jsonData.sms_logs || []).length; i += BATCH_SIZE) {
  const batch = jsonData.sms_logs.slice(i, i + BATCH_SIZE);
  
  for (const sms of batch) {
    try {
      await query(
        'INSERT INTO sms_logs (id, to_phone, group_id, message, semysms_phone, status, error, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          sms.id,
          sms.to_phone,
          sms.group_id,
          sms.message,
          sms.semysms_phone,
          sms.status,
          sms.error || null,
          sms.sent_at || new Date().toISOString()
        ]
      );
      smsCount++;
    } catch (error) {
      console.error(`  ❌ Xato (sms ${sms.id}):`, error.message);
    }
  }
  
  if (smsCount % 1000 === 0) {
    console.log(`  ${smsCount} ta SMS log ko'chirildi...`);
  }
}
console.log(`✓ ${smsCount} ta SMS log ko'chirildi\n`);

// SemySMS phones ni ko'chirish
console.log('📞 SemySMS phones ko\'chirilmoqda...');
let semysmsCount = 0;
for (const semysms of jsonData.semysms_phones || []) {
  try {
    await query(
      'INSERT OR IGNORE INTO semysms_phones (id, phone, balance, device_id, status, last_used, total_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        semysms.id,
        semysms.phone,
        semysms.balance || 0,
        semysms.device_id || null,
        semysms.status || 'active',
        semysms.last_used || null,
        semysms.total_sent || 0,
        semysms.created_at || new Date().toISOString()
      ]
    );
    semysmsCount++;
  } catch (error) {
    console.error(`  ❌ Xato (semysms ${semysms.id}):`, error.message);
  }
}
console.log(`✓ ${semysmsCount} ta SemySMS phone ko'chirildi\n`);

// Settings ni ko'chirish
console.log('⚙️  Settings ko\'chirilmoqda...');
let settingsCount = 0;
for (const setting of jsonData.settings || []) {
  try {
    await query(
      'INSERT OR REPLACE INTO settings (id, key, value, updated_at) VALUES (?, ?, ?, ?)',
      [
        setting.id,
        setting.key,
        setting.value,
        setting.updated_at || new Date().toISOString()
      ]
    );
    settingsCount++;
  } catch (error) {
    console.error(`  ❌ Xato (setting ${setting.key}):`, error.message);
  }
}
console.log(`✓ ${settingsCount} ta setting ko'chirildi\n`);

// Blacklist ni ko'chirish
console.log('🚫 Blacklist ko\'chirilmoqda...');
let blacklistCount = 0;
for (const item of jsonData.blacklist || []) {
  try {
    await query(
      'INSERT OR IGNORE INTO blacklist (id, phone, reason, added_at) VALUES (?, ?, ?, ?)',
      [
        item.id,
        item.phone,
        item.reason || null,
        item.added_at || new Date().toISOString()
      ]
    );
    blacklistCount++;
  } catch (error) {
    console.error(`  ❌ Xato (blacklist ${item.phone}):`, error.message);
  }
}
console.log(`✓ ${blacklistCount} ta blacklist entry ko'chirildi\n`);

// Backup yaratish
const backupPath = path.join(__dirname, '../data/database.json.backup');
fs.copyFileSync(jsonPath, backupPath);
console.log(`✓ JSON backup yaratildi: ${backupPath}\n`);

console.log('=== Migration yakunlandi! ===');
console.log(`\n📊 Jami ko'chirildi:`);
console.log(`  Groups: ${groupsCount}`);
console.log(`  Phones: ${phonesCount}`);
console.log(`  SMS Logs: ${smsCount}`);
console.log(`  SemySMS Phones: ${semysmsCount}`);
console.log(`  Settings: ${settingsCount}`);
console.log(`  Blacklist: ${blacklistCount}`);

process.exit(0);
