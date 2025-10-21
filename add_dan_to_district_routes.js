const { query } = require('./src/database/sqlite');

/**
 * Tuman yo'nalishlariga "dan" variantlarini qo'shish
 */
(async () => {
  console.log('\n🔧 TUMAN YO\'NALISHLARIGA "DAN" VARIANTLARINI QO\'SHISH:\n');

  // Har bir tuman uchun "dan" variantini aniqlash
  const districtDanKeywords = {
    "Yakkabog'": 'yakkabogdan',
    "Qarshi": 'qarshidan',
    "Shahrisabz": 'shahrisabzdan',
    "G'uzor": 'guzordan',
    "Koson": 'kosondan',
    "Nishon": 'nishondan',
    "Qamashi": 'qamashidan',
    "Muborak": 'muborakdan',
    "Kasbi": 'kasbidan',
    "Dehqonobod": 'dehqonoboddan'
  };

  const routes = await query(`
    SELECT id, name, from_keywords
    FROM routes
    WHERE name LIKE 'Qashqadaryo (%) → Toshkent'
    AND active = 1
  `);

  console.log(`Topildi: ${routes.length} ta tuman yo'nalishi\n`);

  for (const route of routes) {
    // Tuman nomini olish
    const match = route.name.match(/Qashqadaryo \((.*?)\) → Toshkent/);
    if (!match) continue;

    const districtName = match[1];
    const danKeyword = districtDanKeywords[districtName];

    if (!danKeyword) {
      console.log(`⚠️ ${route.name} - "dan" keyword topilmadi`);
      continue;
    }

    // FROM keywords ga "dan" variantini qo'shish (agar yo'q bo'lsa)
    const fromKeywords = route.from_keywords.split(',').map(k => k.trim());

    if (!fromKeywords.includes(danKeyword)) {
      fromKeywords.push(danKeyword);

      await query(
        'UPDATE routes SET from_keywords = ? WHERE id = ?',
        [fromKeywords.join(', '), route.id]
      );

      console.log(`✅ ${route.name}`);
      console.log(`   Qo'shildi: ${danKeyword}`);
    } else {
      console.log(`✔️ ${route.name} - allaqachon bor`);
    }
  }

  console.log('\n✅ Barcha tuman yo\'nalishlariga "dan" variantlari qo\'shildi!\n');

  // Tekshirish
  console.log('📊 TEKSHIRISH:\n');

  const check = await query(
    'SELECT from_keywords FROM routes WHERE name = ?',
    ["Qashqadaryo (Yakkabog') → Toshkent"]
  );

  const keywords = check[0].from_keywords.split(',').map(k => k.trim());
  console.log('Yakkabog\' → Toshkent FROM ichida:');
  console.log('  yakkabogdan:', keywords.includes('yakkabogdan') ? '✅ BOR' : '❌ YO\'Q');
  console.log('  yakkabogga:', keywords.includes('yakkabogga') ? '⚠️ BOR (bo\'lmasligi kerak!)' : '✅ YO\'Q');

  process.exit(0);
})();
