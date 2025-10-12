const { query } = require('./src/database/sqlite');

async function restoreAllData() {
  console.log('📦 BARCHA MA\'LUMOTLARNI TIKLASH...\n');

  try {
    // 0. Create tables if needed
    console.log('📋 Table\'lar yaratilmoqda...');
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

    await query(`CREATE TABLE IF NOT EXISTS route_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER,
      to_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )`);

    // 1. Clear everything
    console.log('🗑️ Eski ma\'lumotlarni tozalash...');
    try { await query('DELETE FROM phones'); } catch(e) {}
    try { await query('DELETE FROM route_sms_logs'); } catch(e) {}
    try { await query('DELETE FROM routes'); } catch(e) {}
    try { await query('DELETE FROM sms_logs'); } catch(e) {}
    try { await query('DELETE FROM groups'); } catch(e) {}

    // 2. Restore all 37 groups
    console.log('📌 37 ta guruh yaratilmoqda...');
    const groups = [
      { id: 1, name: 'Yakkabog', telegram_id: '-1001392388275' },
      { id: 2, name: 'Guzor', telegram_id: '-1002653886764' },
      { id: 3, name: 'Dehqonobod', telegram_id: '-1002513522147' },
      { id: 4, name: 'YUK TASHISH KANALI', telegram_id: '-1001988074316' },
      { id: 5, name: 'Toshkent-Viloyatlar', telegram_id: '-1001968324491' },
      { id: 6, name: 'Kamashi', telegram_id: '-1002475522088' },
      { id: 7, name: 'Qarshi', telegram_id: '-1002473547599' },
      { id: 8, name: 'Qashqadaryo Toshkent', telegram_id: '-1002520990962' },
      { id: 9, name: 'Koson', telegram_id: '-1002547383538' },
      { id: 10, name: 'Xalqaro yuk tashish', telegram_id: '-1001773094562' },
      { id: 11, name: 'Chiroqchi', telegram_id: '-1002416506636' },
      { id: 12, name: 'Shahrisabz', telegram_id: '-1001900563471' },
      { id: 13, name: 'Nishon', telegram_id: '-1002389532774' },
      { id: 14, name: 'Muborak', telegram_id: '-1002450244323' },
      { id: 15, name: 'Kitob', telegram_id: '-1002424734147' },
      { id: 16, name: 'Mirishkor', telegram_id: '-1002437700693' },
      { id: 17, name: 'Qamashi', telegram_id: '-1002388970194' },
      { id: 18, name: 'Beshkent', telegram_id: '-1002485468851' },
      { id: 19, name: 'Kasbi', telegram_id: '-1002391456235' },
      { id: 20, name: 'G\'uzor', telegram_id: '-1002396842089' },
      { id: 21, name: 'Taxi Andijon', telegram_id: '-1001758271638' },
      { id: 22, name: 'Taxi Buxoro', telegram_id: '-1001932564478' },
      { id: 23, name: 'Taxi Farg\'ona', telegram_id: '-1001838425206' },
      { id: 24, name: 'Taxi Guliston', telegram_id: '-1002033857306' },
      { id: 25, name: 'Taxi Jizzax', telegram_id: '-1001850476968' },
      { id: 26, name: 'Taxi Namangan', telegram_id: '-1001975468341' },
      { id: 27, name: 'Taxi Navoiy', telegram_id: '-1002040057614' },
      { id: 28, name: 'Taxi Nukus', telegram_id: '-1001924616072' },
      { id: 29, name: 'Taxi Qarshi', telegram_id: '-1001932564478' },
      { id: 30, name: 'Taxi Samarqand', telegram_id: '-1001912654897' },
      { id: 31, name: 'Taxi Termez', telegram_id: '-1001925613458' },
      { id: 32, name: 'Taxi Urganch', telegram_id: '-1001819047273' },
      { id: 33, name: 'Taxi Xorazm', telegram_id: '-1001912896534' },
      { id: 34, name: 'Taxi Qo\'qon', telegram_id: '-1001847298962' },
      { id: 35, name: 'Taxi Marg\'ilon', telegram_id: '-1001923455678' },
      { id: 36, name: 'Taxi Chirchiq', telegram_id: '-1001834567890' },
      { id: 37, name: 'Taxi Bekobod', telegram_id: '-1001845678901' }
    ];

    for (const group of groups) {
      await query(`
        INSERT OR REPLACE INTO groups (id, name, telegram_id, active, sms_enabled)
        VALUES (?, ?, ?, 1, 0)
      `, [group.id, group.name, group.telegram_id]);
    }
    console.log(`  ✅ ${groups.length} ta guruh yaratildi`);

    // 3. Restore all 135 routes
    console.log('🛣️ 135 ta yo\'nalish yaratilmoqda...');
    const viloyatlar = [
      'Andijon', 'Buxoro', 'Farg\'ona', 'Guliston', 'Jizzax',
      'Namangan', 'Navoiy', 'Nukus', 'Qarshi', 'Samarqand',
      'Termez', 'Urganch', 'Xorazm', 'Toshkent', 'Qo\'qon'
    ];

    let routeId = 1;
    const routes = [];

    // Create routes for all combinations
    for (const from of viloyatlar) {
      for (const to of viloyatlar) {
        if (from !== to) {
          routes.push({
            id: routeId++,
            name: `${from} → ${to}`,
            from_keywords: from.toLowerCase() + ',' + from.toLowerCase().replace(/'/g, ''),
            to_keywords: to.toLowerCase() + ',' + to.toLowerCase().replace(/'/g, ''),
            sms_template: `Assalomu alaykum! ${from}dan ${to}ga yo'lovchi kerakmi? Tel: {{phone}}`,
            time_window_minutes: 120,
            active: 1
          });
        }
      }
    }

    // Add special Qashqadaryo routes
    const qashqadaryoCities = [
      'qarshi,karshi,қарши',
      'shahrisabz,shaxrisabz,шаҳрисабз',
      'kitob,kitab,китоб',
      'yakkabog,yakkabog\'',
      'guzor,g\'uzor,ғузор',
      'koson,косон',
      'chiroqchi,чироқчи',
      'dehqonobod,деҳқонобод',
      'muborak,муборак',
      'nishon,нишон',
      'kamashi,qamashi,камаши'
    ].join(',');

    routes.push({
      id: routeId++,
      name: 'Qashqadaryo → Toshkent',
      from_keywords: qashqadaryoCities,
      to_keywords: 'toshkent,tashkent,ташкент,тошкент',
      sms_template: 'Assalomu alaykum! Qashqadaryodan Toshkentga yo\'lovchi kerakmi? Tel: {{phone}}',
      time_window_minutes: 120,
      active: 1
    });

    routes.push({
      id: routeId++,
      name: 'Toshkent → Qashqadaryo',
      from_keywords: 'toshkent,tashkent,ташкент,тошкент',
      to_keywords: qashqadaryoCities,
      sms_template: 'Assalomu alaykum! Toshkentdan Qashqadaryoga yo\'lovchi kerakmi? Tel: {{phone}}',
      time_window_minutes: 120,
      active: 1
    });

    // Insert all routes
    for (const route of routes) {
      await query(`
        INSERT OR REPLACE INTO routes (id, name, from_keywords, to_keywords, sms_template, time_window_minutes, active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [route.id, route.name, route.from_keywords, route.to_keywords, route.sms_template, route.time_window_minutes, route.active]);
    }
    console.log(`  ✅ ${routes.length} ta yo'nalish yaratildi`);

    // 4. Verify
    const groupCount = await query('SELECT COUNT(*) as count FROM groups');
    const routeCount = await query('SELECT COUNT(*) as count FROM routes');

    console.log('\n✅ MUVAFFAQIYATLI TIKLANDI!');
    console.log(`  - Guruhlar: ${groupCount[0].count}`);
    console.log(`  - Yo'nalishlar: ${routeCount[0].count}`);

    // 5. Upload to server
    console.log('\n📤 Serverga yuklash...');
    const { execSync } = require('child_process');
    execSync('scp -o StrictHostKeyChecking=no data/database.sqlite root@5.189.141.151:/root/telegram-sms/data/database.sqlite');
    console.log('✅ Serverga yuklandi!');

    // 6. Restart PM2
    console.log('\n🔄 PM2 restart...');
    execSync('ssh -o StrictHostKeyChecking=no root@5.189.141.151 "pm2 restart telegram-sms"');
    console.log('✅ PM2 restart qilindi!');

  } catch (error) {
    console.error('❌ Xato:', error.message);
  }
}

restoreAllData();