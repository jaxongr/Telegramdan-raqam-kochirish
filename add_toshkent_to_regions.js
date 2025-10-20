const { query } = require('./src/database/sqlite');

const toshkentKeywords = "toshkent, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh";

const routes = [
  // Qashqadaryo tumanlari
  {
    name: "Toshkent → Yakkabog'",
    from: toshkentKeywords,
    to: "yakkabog, yakkabog', yakkabogʻ, yakkabog tuman, yakkaboʻg, yakkabog', yakkabogga, яккабог, яккабоғ, yakaboq, yakabog"
  },
  {
    name: "Toshkent → Qarshi",
    from: toshkentKeywords,
    to: "qarshi, qarshi shahar, qarshiga, қарши, карши, karshi, qrsh, qarshidan"
  },
  {
    name: "Toshkent → Shahrisabz",
    from: toshkentKeywords,
    to: "shahrisabz, shahrisabz shahar, shahrisabzga, shahrisabzdan, шахрисабз, shaxrisabz, shaxrisabzga, sabz, shahrisabs"
  },
  {
    name: "Toshkent → G'uzor",
    from: toshkentKeywords,
    to: "g'uzor, guzor, g'uzor tuman, gʻuzor, guzorga, ғузор, гузор, gʻuzorga, g'uzorga, guzordan"
  },
  {
    name: "Toshkent → Koson",
    from: toshkentKeywords,
    to: "koson, koson tuman, kosonga, косон, қосон, kason, kosondan"
  },
  {
    name: "Toshkent → Nishon",
    from: toshkentKeywords,
    to: "nishon, nishon tuman, nishonga, нишон, нишан, nishondan, nshon"
  },
  {
    name: "Toshkent → Qamashi",
    from: toshkentKeywords,
    to: "qamashi, qamashi tuman, qamashiga, қамаши, камаши, kamashi, qamashidan, qmsh"
  },
  {
    name: "Toshkent → Muborak",
    from: toshkentKeywords,
    to: "muborak, muborak tuman, muborakga, муборак, мубарак, mubarok, muborakdan"
  }
];

(async () => {
  console.log('\n📍 TOSHKENTDAN VILOYATLARGA YO\'NALISHLAR QO\'SHILMOQDA:\n');

  for (const route of routes) {
    // Tekshirish - allaqachon bor-yo'qligini
    const existing = await query('SELECT id FROM routes WHERE name = ?', [route.name]);

    if (existing.length > 0) {
      console.log(`⏭️  ${route.name} - allaqachon mavjud`);
      continue;
    }

    // Qo'shish
    await query(
      `INSERT INTO routes (name, from_keywords, to_keywords, active, created_at)
       VALUES (?, ?, ?, 1, datetime('now'))`,
      [route.name, route.from, route.to]
    );

    console.log(`✅ ${route.name} - qo'shildi`);
  }

  console.log('\n✅ Barcha yo\'nalishlar qo\'shildi!\n');

  // Natijani ko'rsatish
  const allRoutes = await query('SELECT name FROM routes WHERE name LIKE "Toshkent →%" ORDER BY name');
  console.log(`\n📊 JAMI TOSHKENTDAN KETUVCHI YO'NALISHLAR: ${allRoutes.length}\n`);
  allRoutes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
  });

  process.exit(0);
})();
