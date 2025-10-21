const { query } = require('./src/database/sqlite');

/**
 * Toshkentdan barcha tumanlarga yo'nalishlar yaratish
 * Format: "Toshkent → Qashqadaryo (Tuman)"
 */
(async () => {
  console.log('\n🔧 TOSHKENTDAN TUMANLARGA YO\'NALISHLAR YARATISH:\n');

  const toshkentFromKeywords = 'toshkent, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh';

  // Har bir tuman uchun yo'nalish yaratish
  const districts = [
    {
      name: "Yakkabog'",
      toKeywords: "yakkabog, yakkabog', yakkabogʻ, yakkaboʻg, яккабог, yakkabogga, kitob, kitobga"
    },
    {
      name: "Qarshi",
      toKeywords: "qarshi, karshi, қарши, карши, qarshiga"
    },
    {
      name: "Shahrisabz",
      toKeywords: "shahrisabz, shaxrisabz, шахрисабз, sabz, shahrisabzga"
    },
    {
      name: "G'uzor",
      toKeywords: "guzor, g'uzor, gʻuzor, ғузор, гузор, guzorga"
    },
    {
      name: "Koson",
      toKeywords: "koson, kason, косон, қосон, kosonga"
    },
    {
      name: "Nishon",
      toKeywords: "nishon, нишон, нишан, nishonga"
    },
    {
      name: "Qamashi",
      toKeywords: "qamashi, kamashi, қамаши, камаши, qamashiga"
    },
    {
      name: "Muborak",
      toKeywords: "muborak, mubarok, муборак, мубарак, muborakga"
    },
    {
      name: "Kasbi",
      toKeywords: "kasbi, kasby, касби, қасби, kasbiga"
    },
    {
      name: "Dehqonobod",
      toKeywords: "dehqonobod, dexqonobod, деҳқонобод, дехқонобод, dehqanabad, dehqonobodga"
    }
  ];

  console.log(`${districts.length} ta tuman uchun yo'nalishlar yaratilmoqda:\n`);

  for (const district of districts) {
    const routeName = `Toshkent → Qashqadaryo (${district.name})`;

    // Avval borligini tekshirish
    const existing = await query(
      'SELECT id FROM routes WHERE name = ?',
      [routeName]
    );

    if (existing.length > 0) {
      console.log(`⚠️  ${routeName} - allaqachon mavjud (ID: ${existing[0].id})`);

      // Yangilash
      await query(
        'UPDATE routes SET from_keywords = ?, to_keywords = ?, active = 1 WHERE id = ?',
        [toshkentFromKeywords, district.toKeywords, existing[0].id]
      );
      console.log(`   ✅ Yangilandi\n`);
    } else {
      // Yangi yaratish
      const smsTemplate = `Assalomu alaykum! ${district.name} tuman uchun telefon raqam: {{phone}}`;

      await query(
        `INSERT INTO routes (name, from_keywords, to_keywords, sms_template, active, time_window_minutes, created_at)
         VALUES (?, ?, ?, ?, 1, 30, datetime('now'))`,
        [routeName, toshkentFromKeywords, district.toKeywords, smsTemplate]
      );

      console.log(`✅ ${routeName} yaratildi\n`);
    }
  }

  console.log('✅ Barcha yo\'nalishlar yaratildi!\n');

  // Tekshirish
  console.log('📊 TOSHKENTDAN QASHQADARYOGA YO\'NALISHLAR:\n');
  const routes = await query(
    'SELECT id, name FROM routes WHERE name LIKE ? AND active = 1 ORDER BY name',
    ['Toshkent → Qashqadaryo%']
  );

  routes.forEach((r, i) => {
    console.log(`${i + 1}. ID ${r.id}: ${r.name}`);
  });

  console.log(`\nJami: ${routes.length} ta yo'nalish\n`);

  process.exit(0);
})();
