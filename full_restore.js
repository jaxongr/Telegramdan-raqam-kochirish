const fs = require('fs');
const { query } = require('./src/database/sqlite');

async function fullRestore() {
  console.log('🔄 BARCHA MA\'LUMOTLARNI TO\'LIQ TIKLASH...\n');

  try {
    // 1. Read backup
    console.log('📥 Backup oqilmoqda...');
    const backupPath = process.argv[2] || 'data/database.json.backup';
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log(`✅ Backup yuklandi:`);
    console.log(`  - Guruhlar: ${backup.groups?.length || 0}`);
    console.log(`  - Yo'nalishlar: ${backup.routes?.length || 0}`);
    console.log(`  - Telefon raqamlar: ${backup.phones?.length || 0}\n`);

    // 2. Create tables
    console.log('📋 Table\'lar yaratilmoqda...');

    // Routes table
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

    // Route SMS logs table
    await query(`CREATE TABLE IF NOT EXISTS route_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      to_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )`);

    // 3. Clear old data
    console.log('🗑️ Eski ma\'lumotlarni tozalash...');
    try { await query('DELETE FROM phones'); } catch(e) {}
    try { await query('DELETE FROM route_sms_logs'); } catch(e) {}
    try { await query('DELETE FROM routes'); } catch(e) {}
    try { await query('DELETE FROM sms_logs'); } catch(e) {}
    try { await query('DELETE FROM groups'); } catch(e) {}

    // 4. Restore GROUPS
    if (backup.groups && backup.groups.length > 0) {
      console.log(`📌 ${backup.groups.length} ta guruh tiklanmoqda...`);
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
          console.log(`  ⚠️ Guruh ${group.id} xato:`, e.message);
        }
      }
      console.log(`  ✅ ${groupCount} ta guruh tiklandi`);
    }

    // 5. Restore ROUTES
    if (backup.routes && backup.routes.length > 0) {
      console.log(`🛣️ ${backup.routes.length} ta yo'nalish tiklanmoqda...`);
      let routeCount = 0;

      for (const route of backup.routes) {
        try {
          await query(`
            INSERT OR REPLACE INTO routes (id, name, from_keywords, to_keywords, sms_template, time_window_minutes, active)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            route.id,
            route.name || 'Nomsiz yo\'nalish',
            route.from_keywords || route.fromKeywords || '',
            route.to_keywords || route.toKeywords || '',
            route.sms_template || route.smsTemplate || '',
            route.time_window_minutes || route.timeWindowMinutes || 120,
            route.active !== undefined ? route.active : 1
          ]);
          routeCount++;
        } catch(e) {
          console.log(`  ⚠️ Yo'nalish ${route.id} xato:`, e.message);
        }
      }
      console.log(`  ✅ ${routeCount} ta yo'nalish tiklandi`);
    } else {
      // Create default routes if none exist
      console.log('🛣️ Standart yo\'nalishlar yaratilmoqda...');
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
            await query(`
              INSERT OR IGNORE INTO routes (id, name, from_keywords, to_keywords, active)
              VALUES (?, ?, ?, ?, 1)
            `, [
              routeId++,
              `${fromCity} → ${toCity}`,
              cities[i],
              cities[j]
            ]);
          }
        }
      }
      console.log(`  ✅ ${routeId-1} ta standart yo'nalish yaratildi`);
    }

    // 6. Restore PHONES
    if (backup.phones && backup.phones.length > 0) {
      console.log(`📱 ${backup.phones.length} ta telefon raqam tiklanmoqda...`);
      let phoneCount = 0;
      let errorCount = 0;

      // Process in batches of 100
      const batchSize = 100;
      for (let i = 0; i < backup.phones.length; i += batchSize) {
        const batch = backup.phones.slice(i, i + batchSize);

        for (const phone of batch) {
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
            errorCount++;
            if (errorCount < 5) {
              console.log(`  ⚠️ Telefon xato:`, e.message.substring(0, 50));
            }
          }
        }

        if ((i + batchSize) % 500 === 0) {
          console.log(`    ${i + batchSize} / ${backup.phones.length} qayta ishlandi...`);
        }
      }
      console.log(`  ✅ ${phoneCount} ta telefon raqam tiklandi`);
      if (errorCount > 0) {
        console.log(`  ⚠️ ${errorCount} ta xato (duplicate yoki foreign key)`);
      }
    }

    // 7. Final verification
    console.log('\n📊 Yakuniy tekshiruv...');
    const groupCount = await query('SELECT COUNT(*) as count FROM groups');
    const routeCount = await query('SELECT COUNT(*) as count FROM routes');
    const phoneCount = await query('SELECT COUNT(*) as count FROM phones');
    const uniquePhones = await query('SELECT COUNT(DISTINCT phone) as count FROM phones');

    console.log('\n✅ TIKLASH YAKUNLANDI!');
    console.log(`  - Guruhlar: ${groupCount[0].count}`);
    console.log(`  - Yo'nalishlar: ${routeCount[0].count}`);
    console.log(`  - Telefon yozuvlar: ${phoneCount[0].count}`);
    console.log(`  - Unikal raqamlar: ${uniquePhones[0].count}`);

    // Sample data
    const sampleGroups = await query('SELECT name, telegram_id FROM groups LIMIT 5');
    console.log('\n📋 Namuna guruhlar:');
    sampleGroups.forEach(g => console.log(`  - ${g.name} (${g.telegram_id})`));

    const sampleRoutes = await query('SELECT name FROM routes LIMIT 5');
    console.log('\n🛣️ Namuna yo\'nalishlar:');
    sampleRoutes.forEach(r => console.log(`  - ${r.name}`));

  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
  }
}

// Run restore
fullRestore();