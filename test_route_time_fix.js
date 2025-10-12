const { query } = require('./src/database/sqlite');
const { findMatchingPhones, matchesRoute } = require('./src/database/routes');

async function testTimeInterval() {
  console.log('\n=== YO\'NALISHLAR VAQT INTERVAL TEST ===\n');

  // 1. Test ma'lumotlar qo'shish
  console.log('1. Test ma\'lumotlar qo\'shish...');

  // Guruh qo'shish
  await query(
    'INSERT OR IGNORE INTO groups (id, name, telegram_id, active) VALUES (?, ?, ?, ?)',
    [999, 'Test Guruh', '-100999', 1]
  );

  // Turli vaqtlardagi test telefon raqamlar
  const now = new Date();
  const testData = [
    // 1 soat oldin
    {
      phone: '+998901111111',
      message: 'Toshkentdan Qarshiga taksi kerak',
      date: new Date(now - 1 * 60 * 60 * 1000), // 1 soat oldin
      label: '1 soat oldin'
    },
    // 3 soat oldin
    {
      phone: '+998902222222',
      message: 'Qarshidan Toshkentga qaytamiz',
      date: new Date(now - 3 * 60 * 60 * 1000), // 3 soat oldin
      label: '3 soat oldin'
    },
    // 2 kun oldin
    {
      phone: '+998903333333',
      message: 'Toshkentdan Samarqandga pochta',
      date: new Date(now - 2 * 24 * 60 * 60 * 1000), // 2 kun oldin
      label: '2 kun oldin'
    },
    // 7 kun oldin
    {
      phone: '+998904444444',
      message: 'Buxorodan Toshkentga yuk bor',
      date: new Date(now - 7 * 24 * 60 * 60 * 1000), // 7 kun oldin
      label: '7 kun oldin'
    },
    // 30 daqiqa oldin
    {
      phone: '+998905555555',
      message: 'Toshkentdan Andijonga 4 kishi',
      date: new Date(now - 30 * 60 * 1000), // 30 daqiqa oldin
      label: '30 daqiqa oldin'
    }
  ];

  // Ma'lumotlarni qo'shish
  for (const data of testData) {
    await query(
      'INSERT OR REPLACE INTO phones (phone, group_id, last_message, last_date) VALUES (?, ?, ?, ?)',
      [data.phone, 999, data.message, data.date.toISOString()]
    );
    console.log(`  ✓ ${data.label}: ${data.phone}`);
  }

  console.log('\n2. Vaqt interval tekshirish...');

  // 2 soat interval bilan tekshirish
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
  console.log(`  Hozirgi vaqt: ${now.toISOString()}`);
  console.log(`  2 soat oldin: ${twoHoursAgo.toISOString()}`);

  const recentPhones = await query(
    'SELECT phone, last_message, last_date FROM phones WHERE last_date >= ? ORDER BY last_date DESC',
    [twoHoursAgo.toISOString()]
  );

  console.log(`\n  ✓ 2 soat ichidagi telefonlar: ${recentPhones.length} ta`);
  recentPhones.forEach(p => {
    const date = new Date(p.last_date);
    const hoursAgo = Math.round((now - date) / (1000 * 60 * 60) * 10) / 10;
    console.log(`    - ${p.phone}: ${hoursAgo} soat oldin`);
  });

  // 7 kunlik barcha telefonlar (xato holatni ko'rsatish)
  const allPhones = await query('SELECT phone, last_date FROM phones ORDER BY last_date DESC');

  console.log(`\n  ⚠️  Bazadagi barcha telefonlar: ${allPhones.length} ta`);
  allPhones.forEach(p => {
    const date = new Date(p.last_date);
    const daysAgo = Math.round((now - date) / (1000 * 60 * 60 * 24) * 10) / 10;
    console.log(`    - ${p.phone}: ${daysAgo} kun oldin`);
  });

  console.log('\n3. Yo\'nalishlar matching test...');

  // Test route yaratish
  await query(
    'INSERT OR REPLACE INTO routes (id, name, from_keywords, to_keywords, time_window_minutes, active) VALUES (?, ?, ?, ?, ?, ?)',
    [999, 'Toshkent → Qarshi', 'toshkent,tashkent', 'qarshi,karshi', 120, 1]
  );

  // findMatchingPhones funksiyasini test qilish
  const matchedPhones = await findMatchingPhones(999, 120);

  console.log(`\n  ✓ Toshkent→Qarshi yo'nalishi (2 soat interval):`);
  console.log(`    Topilgan: ${matchedPhones.length} ta telefon`);

  matchedPhones.forEach(p => {
    const date = new Date(p.last_date);
    const hoursAgo = Math.round((now - date) / (1000 * 60 * 60) * 10) / 10;
    console.log(`    - ${p.phone}: "${p.last_message.substring(0, 30)}..." (${hoursAgo} soat oldin)`);
  });

  // Tozalash
  await query('DELETE FROM phones WHERE group_id = 999');
  await query('DELETE FROM groups WHERE id = 999');
  await query('DELETE FROM routes WHERE id = 999');

  console.log('\n=== TEST TUGADI ===\n');
}

testTimeInterval().catch(console.error);