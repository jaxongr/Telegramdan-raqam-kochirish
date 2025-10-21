const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n📊 SMS STATISTIKA TEKSHIRUVI:\n');

  // Bugungi SMS lar
  const today = await query(`
    SELECT
      COUNT(*) as jami,
      COUNT(CASE WHEN status = 'success' THEN 1 END) as muvaffaqiyatli,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as muvaffaqiyatsiz,
      MIN(sent_at) as birinchi,
      MAX(sent_at) as oxirgi
    FROM sms_logs
    WHERE DATE(sent_at) = DATE('now')
  `);

  console.log('📅 BUGUN:');
  console.log(`   Jami SMS: ${today[0].jami} ta`);
  console.log(`   Muvaffaqiyatli: ${today[0].muvaffaqiyatli} ta`);
  console.log(`   Muvaffaqiyatsiz: ${today[0].muvaffaqiyatsiz} ta`);
  console.log(`   Birinchi SMS: ${today[0].birinchi || 'N/A'}`);
  console.log(`   Oxirgi SMS: ${today[0].oxirgi || 'N/A'}`);

  // Kecha
  const yesterday = await query(`
    SELECT COUNT(*) as jami
    FROM sms_logs
    WHERE DATE(sent_at) = DATE('now', '-1 day')
  `);

  console.log(`\n📅 KECHA: ${yesterday[0].jami} ta SMS\n`);

  // O'sish foizi
  if (yesterday[0].jami > 0) {
    const growth = ((today[0].jami - yesterday[0].jami) / yesterday[0].jami * 100).toFixed(1);
    console.log(`📈 O'sish: ${growth}%\n`);
  }

  // Oxirgi 10 ta SMS
  const recent = await query(`
    SELECT
      phone,
      status,
      sent_at,
      error_message
    FROM sms_logs
    ORDER BY sent_at DESC
    LIMIT 10
  `);

  console.log('📋 OXIRGI 10 TA SMS:\n');
  recent.forEach((sms, idx) => {
    console.log(`${idx + 1}. ${sms.phone} - ${sms.status} (${sms.sent_at})`);
    if (sms.error_message) {
      console.log(`   Xato: ${sms.error_message}`);
    }
  });

  // Bugungi SMS lar statistikasi (soatlik)
  const hourly = await query(`
    SELECT
      strftime('%H', sent_at) as soat,
      COUNT(*) as soni
    FROM sms_logs
    WHERE DATE(sent_at) = DATE('now')
    GROUP BY soat
    ORDER BY soat DESC
  `);

  console.log('\n⏰ BUGUN SOATLIK:\n');
  hourly.forEach(h => {
    console.log(`   ${h.soat}:00 - ${h.soni} ta SMS`);
  });

  process.exit(0);
})();
