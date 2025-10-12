const fs = require('fs');
const { query } = require('./src/database/sqlite');

async function serverRestore() {
  console.log('🔄 Server Database Restoration...\n');

  try {
    // Read backup
    const backup = JSON.parse(fs.readFileSync('data/database.json.backup', 'utf8'));
    console.log(`✅ Backup loaded:`);
    console.log(`  - Groups: ${backup.groups?.length || 0}`);
    console.log(`  - Routes: ${backup.routes?.length || 0}`);
    console.log(`  - Phones: ${backup.phones?.length || 0}\n`);

    // Create tables
    console.log('📋 Creating tables...');

    await query(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      telegram_id TEXT UNIQUE NOT NULL,
      keywords TEXT DEFAULT '',
      sms_template TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      sms_enabled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await query(`CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      from_keywords TEXT NOT NULL,
      to_keywords TEXT NOT NULL,
      sms_template TEXT DEFAULT '',
      time_window_minutes INTEGER DEFAULT 120,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await query(`CREATE TABLE IF NOT EXISTS phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      group_id INTEGER DEFAULT 1,
      first_message TEXT,
      last_message TEXT,
      first_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      repeat_count INTEGER DEFAULT 1,
      lifetime_unique INTEGER DEFAULT 0,
      UNIQUE(phone, group_id),
      FOREIGN KEY (group_id) REFERENCES groups(id)
    )`);

    await query(`CREATE TABLE IF NOT EXISTS sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      error TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await query(`CREATE TABLE IF NOT EXISTS route_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      to_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )`);

    // Restore groups
    console.log('📌 Restoring groups...');
    if (backup.groups && backup.groups.length > 0) {
      let groupCount = 0;
      for (const group of backup.groups) {
        try {
          await query(`
            INSERT OR REPLACE INTO groups (id, name, telegram_id, keywords, sms_template, active, sms_enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            group.id,
            group.name || 'Nomsiz guruh',
            group.telegram_id || group.telegramId || '-100' + group.id,
            group.keywords || '',
            group.sms_template || group.smsTemplate || '',
            group.active !== undefined ? group.active : 1,
            group.sms_enabled || group.smsEnabled || 0,
            group.created_at || group.createdAt || new Date().toISOString()
          ]);
          groupCount++;
        } catch(e) {
          console.log(`  ⚠️ Group ${group.id} error:`, e.message);
        }
      }
      console.log(`  ✅ ${groupCount} groups restored`);
    }

    // Create standard routes
    console.log('🛣️ Creating standard routes...');
    const cities = [
      'toshkent,tashkent',
      'andijon,andijan',
      'buxoro,bukhara',
      'fargona,fergana',
      'jizzax,jizzak',
      'xorazm,khorezm',
      'namangan',
      'navoiy,navoi',
      'qashqadaryo,kashkadarya',
      'qarshi,karshi',
      'samarqand,samarkand',
      'surxondaryo,surkhandarya',
      'sirdaryo',
      'nukus',
      'urganch,urgench'
    ];

    let routeId = 1;
    for (let i = 0; i < cities.length; i++) {
      for (let j = 0; j < cities.length; j++) {
        if (i !== j) {
          const fromCity = cities[i].split(',')[0];
          const toCity = cities[j].split(',')[0];
          try {
            await query(`
              INSERT OR IGNORE INTO routes (id, name, from_keywords, to_keywords, active)
              VALUES (?, ?, ?, ?, 1)
            `, [
              routeId++,
              `${fromCity} → ${toCity}`,
              cities[i],
              cities[j]
            ]);
          } catch(e) {
            // Skip errors
          }
        }
      }
    }
    console.log(`  ✅ ${routeId-1} routes created`);

    // Restore limited phones for initial setup
    if (backup.phones && backup.phones.length > 0) {
      console.log(`📱 Restoring first 500 phone numbers...`);
      let phoneCount = 0;

      for (const phone of backup.phones.slice(0, 500)) {
        try {
          await query(`
            INSERT OR IGNORE INTO phones (phone, group_id, first_message, last_message, first_date, last_date, repeat_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            phone.phone,
            phone.group_id || phone.groupId || 1,
            phone.first_message || phone.firstMessage || phone.message || '',
            phone.last_message || phone.lastMessage || phone.message || '',
            phone.first_date || phone.firstDate || phone.date || new Date().toISOString(),
            phone.last_date || phone.lastDate || phone.date || new Date().toISOString(),
            phone.repeat_count || phone.repeatCount || 1
          ]);
          phoneCount++;
        } catch(e) {
          // Skip errors
        }
      }
      console.log(`  ✅ ${phoneCount} phone numbers restored`);
    }

    // Final verification
    console.log('\n📊 Final verification...');
    const groupCount = await query('SELECT COUNT(*) as count FROM groups');
    const routeCount = await query('SELECT COUNT(*) as count FROM routes');
    const phoneCount = await query('SELECT COUNT(*) as count FROM phones');
    const uniquePhones = await query('SELECT COUNT(DISTINCT phone) as count FROM phones');

    console.log('\n✅ RESTORATION COMPLETE!');
    console.log(`  - Groups: ${groupCount[0].count}`);
    console.log(`  - Routes: ${routeCount[0].count}`);
    console.log(`  - Phone records: ${phoneCount[0].count}`);
    console.log(`  - Unique numbers: ${uniquePhones[0].count}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

serverRestore();