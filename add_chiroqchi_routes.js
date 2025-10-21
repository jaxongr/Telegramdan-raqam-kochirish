const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 CHIROQCHI YO\'NALISHLARINI YARATISH:\n');

  const toshkentFromKeywords = 'toshkent, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh';
  
  // 1. Toshkent → Qashqadaryo (Chiroqchi)
  const route1Name = 'Toshkent → Qashqadaryo (Chiroqchi)';
  const toKeywords = 'chiroqchi, chiroqchiga, чироқчи, чирокчи, chirokchi';
  
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [route1Name, toshkentFromKeywords, toKeywords, 'Assalomu alaykum! Chiroqchi tuman uchun telefon raqam: {{phone}}']
  );
  console.log('✅ ' + route1Name + ' yaratildi');

  // 2. Qashqadaryo (Chiroqchi) → Toshkent
  const route2Name = 'Qashqadaryo (Chiroqchi) → Toshkent';
  const fromKeywords = 'chiroqchi, chiroqchidan, чироқчи, чирокчи, chirokchi';
  const toshkentToKeywords = 'toshkent, toshkentga, toshkent shahar, тошкент, ташкент, tashkent, tsh';
  
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [route2Name, fromKeywords, toshkentToKeywords, 'Assalomu alaykum! Chiroqchidan Toshkentga yo\'lovchi uchun telefon raqam: {{phone}}']
  );
  console.log('✅ ' + route2Name + ' yaratildi');

  console.log('\n✅ Chiroqchi yo\'nalishlari muvaffaqiyatli yaratildi!\n');
  process.exit(0);
})();
