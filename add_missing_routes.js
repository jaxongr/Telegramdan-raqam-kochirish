const { query } = require('./src/database/sqlite');

// Dehqonobod kalit so'zlari
const dehqonobodKeywords = [
  // Asosiy
  'dehqonobod', 'dehqonobodga', 'dehqonoboddan', 'dehqonobodda',
  // Xatoliklar
  'dexqonobod', 'deqonobod', 'dehqonоbod', 'deхqonobod',
  'dehqanabad', 'dehqonabad', 'dehqonоbоd',
  // Barcha shakllari
  'dexqonobodga', 'dexqonoboddan', 'deqonobodga', 'deqonoboddan',
  'dehqanabadga', 'dehqanabaddan',
  // Kirill
  'деҳқонобод', 'дехқонобод', 'деқонобод', 'деҳқанабад',
  'деҳқонободга', 'деҳқонободдан', 'деҳқонободда',
  'дехқонободга', 'дехқонободдан', 'дехқонободда',
  // Ruscha xatoliklar
  'дехконобод', 'дехқонобод', 'деқонобод',
  'деҳқонабад', 'дехқанабад',
  // Qisqartmalar
  'dehqon', 'dehqonga', 'dehqondan',
  'deqon', 'deqonga', 'deqondan'
].join(', ');

// Mirishkor kalit so'zlari - 50+
const mirishkorKeywords = [
  // Asosiy
  'mirishkor', 'mirishkorga', 'mirishkordan', 'mirishkorda',
  // Xatoliklar
  'mirishkоr', 'mirishkоr', 'mirishkor', 'mirishkor',
  'mirishkur', 'mirishkar', 'mirshkor', 'mirishqor',
  // Barcha shakllari
  'mirishkorga', 'mirishkordan', 'mirishkurga', 'mirishkurdan',
  'mirishkarga', 'mirishkardan', 'mirshkorga', 'mirshkordan',
  'mirishqorga', 'mirishqordan',
  // Kirill - barcha variantlar
  'миришкор', 'миришқор', 'миришкур', 'миришкар',
  'миришкорга', 'миришкордан', 'миришкорда',
  'миришқорга', 'миришқордан', 'миришқорда',
  'миришкурга', 'миришкурдан', 'миришкурда',
  // Ruscha xatoliklar
  'миришкор', 'миришкор', 'миришкур',
  'мирошкор', 'мирашкор', 'мирешкор',
  // Qisqartmalar
  'mirish', 'mirishga', 'mirishdan',
  'mir', 'mirga', 'mirdan',
  // Ko'p uchraydigan
  'миришк', 'миришкга', 'миришкдан'
].join(', ');

(async () => {
  console.log('\n🔧 YETISHMAYOTGAN YO\'NALISHLARNI QO\'SHISH:\n');

  const toshkentFromKeywords = 'toshkent, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh';
  const toshkentToKeywords = 'toshkent, toshkentga, toshkent shahar, тошкент, ташкент, tashkent, tsh';

  // 1. Dehqonobod → Toshkent (yetishmayotgan)
  console.log('📍 Dehqonobod:');
  const dehqRoute = 'Qashqadaryo (Dehqonobod) → Toshkent';
  const existing = await query('SELECT id FROM routes WHERE name = ?', [dehqRoute]);

  if (existing.length === 0) {
    await query(
      `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
       VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
      [dehqRoute, dehqonobodKeywords, toshkentToKeywords,
       'Assalomu alaykum! Dehqonoboddan Toshkentga yo\'lovchi uchun telefon raqam: {{phone}}']
    );
    console.log('  ✅ Qashqadaryo (Dehqonobod) → Toshkent yaratildi');
  } else {
    await query('UPDATE routes SET from_keywords = ? WHERE id = ?',
      [dehqonobodKeywords, existing[0].id]);
    console.log('  ✅ Qashqadaryo (Dehqonobod) → Toshkent yangilandi');
  }

  // 2. Mirishkor yo'nalishlari (yangi tuman)
  console.log('\n📍 Mirishkor (YANGI):');

  // Toshkent → Mirishkor
  const mir1 = 'Toshkent → Qashqadaryo (Mirishkor)';
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [mir1, toshkentFromKeywords, mirishkorKeywords,
     'Assalomu alaykum! Mirishkor tuman uchun telefon raqam: {{phone}}']
  );
  console.log('  ✅ Toshkent → Qashqadaryo (Mirishkor) yaratildi');

  // Mirishkor → Toshkent
  const mir2 = 'Qashqadaryo (Mirishkor) → Toshkent';
  await query(
    `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
     VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
    [mir2, mirishkorKeywords, toshkentToKeywords,
     'Assalomu alaykum! Mirishkordan Toshkentga yo\'lovchi uchun telefon raqam: {{phone}}']
  );
  console.log('  ✅ Qashqadaryo (Mirishkor) → Toshkent yaratildi');

  console.log('\n✅ Barcha yetishmayotgan yo\'nalishlar qo\'shildi!');
  console.log('📊 Mirishkor: ' + mirishkorKeywords.split(', ').length + ' ta kalit so\'z\n');

  process.exit(0);
})();
