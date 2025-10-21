const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 KITOB YO\'NALISHLARINI YARATISH:\n');

  const toshkentFromKeywords = 'toshkent, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh';
  
  // 1. Toshkent → Qashqadaryo (Kitob)
  const route1Name = 'Toshkent → Qashqadaryo (Kitob)';
  const toKeywords = 'kitob, kitobga, китоб, yakkabog, yakkabogga';
  
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [route1Name, toshkentFromKeywords, toKeywords, 'Assalomu alaykum! Kitob tuman uchun telefon raqam: {{phone}}']
  );
  console.log('✅ ' + route1Name + ' yaratildi');

  // 2. Qashqadaryo (Kitob) → Toshkent
  const route2Name = 'Qashqadaryo (Kitob) → Toshkent';
  const fromKeywords = 'kitob, kitobdan, китоб, yakkabog, yakkabogdan';
  const toshkentToKeywords = 'toshkent, toshkentga, toshkent shahar, тошкент, ташкент, tashkent, tsh';
  
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [route2Name, fromKeywords, toshkentToKeywords, 'Assalomu alaykum! Kitobdan Toshkentga yo\'lovchi uchun telefon raqam: {{phone}}']
  );
  console.log('✅ ' + route2Name + ' yaratildi');

  console.log('\n✅ Kitob yo\'nalishlari muvaffaqiyatli yaratildi!\n');
  process.exit(0);
})();
