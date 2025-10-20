const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 TOSHKENT YO\'NALISHLARNI TO\'G\'RILASH:\n');

  // Barcha Qashqadaryo tumanlarining keywordlari
  const qashqadaryoKeywords = [
    "qashqadaryo", "qashqadaryo viloyati", "qashqadaryoga", "qashqadaryodan",
    "қашқадарё", "kashkadarya", "qashqadaryo viloyat", "qashqa",

    // Barcha tumanlar
    "yakkabog", "yakkabog'", "yakkabogʻ", "yakkaboʻg", "яккабог",
    "qarshi", "karshi", "қарши", "карши",
    "shahrisabz", "shaxrisabz", "шахрисабз", "sabz",
    "g'uzor", "guzor", "gʻuzor", "ғузор", "гузор",
    "koson", "kason", "косон", "қосон",
    "nishon", "nishondan", "нишон", "нишан",
    "qamashi", "kamashi", "қамаши", "камаши",
    "muborak", "mubarok", "муборак", "мубарак",
    "kasbi", "kasby", "касби", "қасби",
    "dehqonobod", "dexqonobod", "деҳқонобод", "дехқонобод", "dehqanabad",
    "kitob", "китоб"
  ].join(', ');

  const toshkentKeywords = "toshkent, toshkentga, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh";

  // 1. "Toshkent → Qashqadaryo" ni tekshirish va qo'shish/yangilash
  const existing = await query('SELECT id FROM routes WHERE name = ?', ['Toshkent → Qashqadaryo']);

  if (existing.length > 0) {
    // Yangilash
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ?, active = 1 WHERE name = ?',
      [toshkentKeywords, qashqadaryoKeywords, 'Toshkent → Qashqadaryo']
    );
    console.log(`✅ "Toshkent → Qashqadaryo" yangilandi (barcha tumanlar bilan)`);
  } else {
    // Qo'shish
    await query(
      `INSERT INTO routes (name, from_keywords, to_keywords, active, created_at)
       VALUES (?, ?, ?, 1, datetime('now'))`,
      ['Toshkent → Qashqadaryo', toshkentKeywords, qashqadaryoKeywords]
    );
    console.log(`✅ "Toshkent → Qashqadaryo" qo'shildi (barcha tumanlar bilan)`);
  }

  // 2. Eski noto'g'ri tumanlar yo'nalishlarini o'chirish o'rniga - o'chirib qo'yamiz (active=0)
  const wrongRoutes = [
    'Toshkent → G\'uzor',
    'Toshkent → Koson',
    'Toshkent → Muborak',
    'Toshkent → Nishon',
    'Toshkent → Qamashi',
    'Toshkent → Qarshi',
    'Toshkent → Shahrisabz',
    'Toshkent → Yakkabog\''
  ];

  console.log('\n🔄 Noto\'g\'ri yo\'nalishlarni o\'chirish:\n');
  for (const name of wrongRoutes) {
    const result = await query('UPDATE routes SET active = 0 WHERE name = ?', [name]);
    if (result.changes > 0) {
      console.log(`  ❌ O'chirildi: ${name}`);
    }
  }

  // Natijani ko'rsatish
  console.log('\n📊 TOSHKENTDAN VILOYATLARGA YO\'NALISHLAR (faol):\n');
  const allRoutes = await query(
    'SELECT name FROM routes WHERE name LIKE ? AND active = 1 ORDER BY name',
    ['Toshkent →%']
  );

  allRoutes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
  });

  console.log(`\nJami: ${allRoutes.length} ta\n`);

  console.log('✅ Tayyor! Endi "Toshkent → Qashqadaryo" yo\'nalishida barcha tumanlar e\'lonlari yig\'iladi.\n');

  process.exit(0);
})();
