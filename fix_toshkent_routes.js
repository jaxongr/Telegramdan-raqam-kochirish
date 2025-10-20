const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 TOSHKENT YO\'NALISHLARNI TO\'G\'RILASH:\n');

  // 1. Eski noto'g'ri yo'nalishlarni o'chirish (tumanlar uchun)
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

  for (const name of wrongRoutes) {
    await query('DELETE FROM routes WHERE name = ?', [name]);
    console.log(`🗑️  O'chirildi: ${name}`);
  }

  // 2. To'g'ri yo'nalish yaratish - Toshkent → Qashqadaryo (viloyat)
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

  // Tekshirish
  const existing = await query('SELECT id FROM routes WHERE name = ?', ['Toshkent → Qashqadaryo']);

  if (existing.length > 0) {
    // Yangilash
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE name = ?',
      [toshkentKeywords, qashqadaryoKeywords, 'Toshkent → Qashqadaryo']
    );
    console.log(`\n✅ "Toshkent → Qashqadaryo" yangilandi (barcha tumanlar bilan)`);
  } else {
    // Qo'shish
    await query(
      `INSERT INTO routes (name, from_keywords, to_keywords, active, created_at)
       VALUES (?, ?, ?, 1, datetime('now'))`,
      ['Toshkent → Qashqadaryo', toshkentKeywords, qashqadaryoKeywords]
    );
    console.log(`\n✅ "Toshkent → Qashqadaryo" qo'shildi (barcha tumanlar bilan)`);
  }

  // Natijani ko'rsatish
  console.log('\n📊 TOSHKENTDAN VILOYATLARGA YO\'NALISHLAR:\n');
  const allRoutes = await query(
    'SELECT name FROM routes WHERE name LIKE ? ORDER BY name',
    ['Toshkent →%']
  );

  allRoutes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
  });

  console.log(`\nJami: ${allRoutes.length} ta\n`);

  process.exit(0);
})();
