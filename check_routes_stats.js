const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n📊 YO\'NALISHLAR STATISTIKASI:\n');

  // Barcha yo'nalishlar
  const routes = await query('SELECT id, name, active FROM routes ORDER BY id');
  console.log(`Jami yo'nalishlar: ${routes.length}`);
  console.log(`Faol yo'nalishlar: ${routes.filter(r => r.active).length}\n`);

  // Har bir yo'nalish bo'yicha e'lonlar
  for (const route of routes) {
    const messages = await query(
      'SELECT COUNT(*) as count FROM route_messages WHERE route_id = ?',
      [route.id]
    );

    const phones = await query(
      'SELECT phone_numbers FROM route_messages WHERE route_id = ?',
      [route.id]
    );

    const allPhones = new Set();
    phones.forEach(row => {
      try {
        const phoneList = JSON.parse(row.phone_numbers || '[]');
        phoneList.forEach(p => allPhones.add(p));
      } catch (e) {}
    });

    const status = route.active ? '✅' : '❌';
    console.log(`${status} ${route.name}`);
    console.log(`   E'lonlar: ${messages[0].count}`);
    console.log(`   Unikal raqamlar: ${allPhones.size}`);
  }

  // Jami
  const totalMessages = await query('SELECT COUNT(*) as count FROM route_messages');
  const totalPhones = await query('SELECT phone_numbers FROM route_messages');
  const allUniquePhones = new Set();

  totalPhones.forEach(row => {
    try {
      const phoneList = JSON.parse(row.phone_numbers || '[]');
      phoneList.forEach(p => allUniquePhones.add(p));
    } catch (e) {}
  });

  console.log(`\n📈 JAMI:`);
  console.log(`   E'lonlar: ${totalMessages[0].count}`);
  console.log(`   Unikal raqamlar: ${allUniquePhones.size}`);

  // Oxirgi 20 ta e'lon
  console.log(`\n\n🕐 OXIRGI 20 TA E'LON:\n`);
  const recent = await query(`
    SELECT
      r.name as route_name,
      rm.message_text,
      rm.phone_numbers,
      rm.message_date
    FROM route_messages rm
    JOIN routes r ON r.id = rm.route_id
    ORDER BY rm.message_date DESC
    LIMIT 20
  `);

  recent.forEach((msg, i) => {
    const date = new Date(msg.message_date).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    const phones = JSON.parse(msg.phone_numbers || '[]');
    const preview = msg.message_text.substring(0, 60).replace(/\n/g, ' ');

    console.log(`${i + 1}. ${msg.route_name}`);
    console.log(`   Vaqt: ${date}`);
    console.log(`   Raqamlar: ${phones.join(', ')}`);
    console.log(`   Matn: ${preview}...`);
    console.log('');
  });

  // Loglardan so'nggi 100 ta xabarni tekshirish
  console.log(`\n\n🔍 SO'NGGI LOGLAR TAHLILI:\n`);
  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

  console.log(`Oxirgi 1 soat ichida (${oneHourAgo} dan keyin):`);
  const recentHour = await query(`
    SELECT COUNT(*) as count
    FROM route_messages
    WHERE message_date > ?
  `, [oneHourAgo]);

  console.log(`   E'lonlar: ${recentHour[0].count}`);

  process.exit(0);
})();
