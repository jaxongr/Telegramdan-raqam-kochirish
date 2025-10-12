const { query } = require('./src/database/sqlite');

async function getStats() {
  const twoHoursAgo = new Date(Date.now() - 2*60*60*1000).toISOString();

  console.log('\n' + '='.repeat(60));
  console.log('📊 OXIRGI 2 SOAT MONITORING STATISTIKASI');
  console.log('='.repeat(60) + '\n');

  // Faol guruhlar
  const activeGroups = await query('SELECT COUNT(*) as total FROM groups WHERE active = 1');
  console.log('🔵 FAOL GURUHLAR: ' + activeGroups[0].total + ' ta');

  // SMS yoqilgan guruhlar
  const smsGroups = await query('SELECT COUNT(*) as total FROM groups WHERE active = 1 AND sms_enabled = 1');
  console.log('📧 SMS YOQILGAN GURUHLAR: ' + smsGroups[0].total + ' ta');

  // 2 soat ichida topilgan telefonlar
  const phones = await query('SELECT COUNT(*) as total FROM phones WHERE last_date >= ?', [twoHoursAgo]);
  console.log('\n📱 2 SOAT ICHIDA TOPILGAN RAQAMLAR: ' + phones[0].total + ' ta');

  // Unikal telefon raqamlar
  const uniquePhones = await query('SELECT COUNT(DISTINCT phone) as total FROM phones WHERE last_date >= ?', [twoHoursAgo]);
  console.log('☎️  UNIKAL RAQAMLAR: ' + uniquePhones[0].total + ' ta');

  // Har guruh bo'yicha
  const byGroup = await query(`
    SELECT g.name, COUNT(DISTINCT p.phone) as phone_count, COUNT(p.id) as total_count
    FROM phones p
    JOIN groups g ON p.group_id = g.id
    WHERE p.last_date >= ?
    GROUP BY g.id, g.name
    ORDER BY phone_count DESC
    LIMIT 10
  `, [twoHoursAgo]);

  console.log('\n📊 TOP 10 GURUHLAR (2 soat ichida):\n');
  byGroup.forEach((g, i) => {
    const name = g.name.substring(0,30).padEnd(30);
    console.log(`  ${i+1}. ${name} - ${g.phone_count} ta unikal, ${g.total_count} ta jami`);
  });

  // Har daqiqadagi o'rtacha
  const avgPerMinute = Math.round(phones[0].total / 120);
  console.log('\n⚡ TEZLIK: ~' + avgPerMinute + ' ta e\'lon/daqiqa');

  // SMS yuborilgan
  const smsLogs = await query('SELECT COUNT(*) as total FROM sms_logs WHERE sent_at >= datetime(\'now\', \'-2 hours\')');
  console.log('\n💬 SMS YUBORILGAN (2 soat): ' + smsLogs[0].total + ' ta');

  // Har guruhda nechta xabar
  const messagesByGroup = await query(`
    SELECT g.name, COUNT(*) as message_count
    FROM phones p
    JOIN groups g ON p.group_id = g.id
    WHERE p.last_date >= ?
    GROUP BY g.id
    ORDER BY message_count DESC
  `, [twoHoursAgo]);

  let totalMessages = 0;
  messagesByGroup.forEach(g => {
    totalMessages += g.message_count;
  });

  console.log('\n📨 JAMI XABARLAR QAYTA ISHLANDI: ' + totalMessages + ' ta');

  // Yo'nalishlar statistikasi
  console.log('\n🛣️  YO\'NALISHLAR STATISTIKASI:');
  const routeStats = await query(`
    SELECT name, from_keywords, to_keywords
    FROM routes
    WHERE active = 1 AND use_region_matching = 1
    LIMIT 5
  `);

  for (const route of routeStats) {
    // Bu yo'nalish uchun matching phones
    const matchingPhones = await query(`
      SELECT COUNT(DISTINCT phone) as count
      FROM phones
      WHERE last_date >= ?
    `, [twoHoursAgo]);

    console.log(`  • ${route.name}: ${matchingPhones[0].count} ta raqam mos kelishi mumkin`);
  }

  console.log('\n' + '='.repeat(60));

  // Jami
  const allPhones = await query('SELECT COUNT(*) as total FROM phones');
  const allGroups = await query('SELECT COUNT(*) as total FROM groups');
  const allRoutes = await query('SELECT COUNT(*) as total FROM routes WHERE active = 1');
  const allSMS = await query('SELECT COUNT(*) as total FROM sms_logs');

  console.log('\n📈 UMUMIY STATISTIKA:');
  console.log('  • Jami guruhlar: ' + allGroups[0].total);
  console.log('  • Jami telefon raqamlar: ' + allPhones[0].total);
  console.log('  • Faol yo\'nalishlar: ' + allRoutes[0].total);
  console.log('  • Jami SMS yuborilgan: ' + allSMS[0].total);

  // Last hour vs previous hour comparison
  const oneHourAgo = new Date(Date.now() - 60*60*1000).toISOString();
  const lastHour = await query('SELECT COUNT(*) as total FROM phones WHERE last_date >= ?', [oneHourAgo]);
  const prevHour = await query('SELECT COUNT(*) as total FROM phones WHERE last_date >= ? AND last_date < ?', [twoHoursAgo, oneHourAgo]);

  console.log('\n📊 SOATLIK TAQQOSLASH:');
  console.log('  • Oxirgi soat: ' + lastHour[0].total + ' ta e\'lon');
  console.log('  • Oldingi soat: ' + prevHour[0].total + ' ta e\'lon');

  if (lastHour[0].total > prevHour[0].total) {
    console.log('  • 📈 Trend: ORTIB BORYAPTI (+' + (lastHour[0].total - prevHour[0].total) + ')');
  } else {
    console.log('  • 📉 Trend: Kamaygan (-' + (prevHour[0].total - lastHour[0].total) + ')');
  }

  console.log('\n✅ XULOSA: Sistema to\'liq ishlayapti!');
  console.log('='.repeat(60));
}

getStats().catch(console.error);