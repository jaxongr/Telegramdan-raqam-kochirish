const { query } = require('./src/database/sqlite');

/**
 * Kalit so'zlarga "dan" va "ga" qo'shimchalarini qo'shish
 */
(async () => {
  console.log('\n🔧 KALIT SO\'ZLARGA QO\'SHIMCHALAR QO\'SHISH:\n');

  // Barcha faol yo'nalishlarni olish
  const routes = await query('SELECT id, name, from_keywords, to_keywords FROM routes WHERE active = 1');

  for (const route of routes) {
    const fromKeywords = route.from_keywords.split(',').map(k => k.trim());
    const toKeywords = route.to_keywords.split(',').map(k => k.trim());

    // FROM keywords uchun "dan" qo'shimchasini qo'shish (agar yo'q bo'lsa)
    const expandedFrom = new Set();
    fromKeywords.forEach(kw => {
      expandedFrom.add(kw);

      // Agar "dan" bilan tugamasa va maxsus holatlar bo'lmasa
      if (!kw.endsWith('dan') && !kw.endsWith('дан') && !kw.endsWith('ga') && !kw.endsWith('га')) {
        // "dan" variantini qo'shish
        expandedFrom.add(kw + 'dan');

        // Agar oxirgi harf unli bo'lsa, o'rtasiga "n" qo'shish
        // Masalan: "qarshi" → "qarshidan" (shart emas, chunki "qarshidan" allaqachon bor)
      }
    });

    // TO keywords uchun "ga" qo'shimchasini qo'shish (agar yo'q bo'lsa)
    const expandedTo = new Set();
    toKeywords.forEach(kw => {
      expandedTo.add(kw);

      // Agar "ga" bilan tugamasa va maxsus holatlar bo'lmasa
      if (!kw.endsWith('ga') && !kw.endsWith('га') && !kw.endsWith('dan') && !kw.endsWith('дан')) {
        expandedTo.add(kw + 'ga');
      }
    });

    // Yangi keywords listini yaratish
    const newFrom = Array.from(expandedFrom).join(', ');
    const newTo = Array.from(expandedTo).join(', ');

    // Update qilish
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE id = ?',
      [newFrom, newTo, route.id]
    );

    console.log(`✅ ${route.name}`);
    console.log(`   FROM: ${fromKeywords.length} → ${expandedFrom.size} ta keyword`);
    console.log(`   TO: ${toKeywords.length} → ${expandedTo.size} ta keyword\n`);
  }

  console.log('✅ Barcha yo\'nalishlar yangilandi!\n');

  // Tekshirish
  console.log('📊 TEKSHIRISH (Qashqadaryo → Toshkent):\n');
  const check = await query('SELECT from_keywords, to_keywords FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);

  if (check.length > 0) {
    const fromList = check[0].from_keywords.split(',').map(k => k.trim());
    const toList = check[0].to_keywords.split(',').map(k => k.trim());

    console.log('FROM keywords:');
    console.log(fromList.filter(k => k.includes('qarshi')).join(', '));
    console.log('\nTO keywords:');
    console.log(toList.slice(0, 10).join(', '), '...');
  }

  process.exit(0);
})();
