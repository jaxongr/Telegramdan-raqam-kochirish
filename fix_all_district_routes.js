const { query } = require('./src/database/sqlite');

/**
 * BARCHA tuman yo'nalishlarining FROM/TO ni to'g'rilash
 *
 * Muammo: "Qashqadaryo (Tuman) → Toshkent" yo'nalishlari FROM da toshkent, TO da tuman
 * To'g'risi: FROM da tuman, TO da toshkent bo'lishi kerak
 */
(async () => {
  console.log('\n🔧 BARCHA TUMAN YO\'NALISHLARINI TO\'G\'RILASH:\n');

  // Barcha "Qashqadaryo (Tuman) → Toshkent" yo'nalishlarini olish
  const routes = await query(`
    SELECT id, name, from_keywords, to_keywords
    FROM routes
    WHERE name LIKE 'Qashqadaryo (%) → Toshkent'
    AND active = 1
  `);

  console.log(`Topildi: ${routes.length} ta tuman yo'nalishi\n`);

  for (const route of routes) {
    // FROM va TO ni almashtirish (chunki ular almashib qolgan!)
    const correctFrom = route.to_keywords; // Hozirgi TO aslida FROM bo'lishi kerak
    const correctTo = route.from_keywords; // Hozirgi FROM aslida TO bo'lishi kerak

    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE id = ?',
      [correctFrom, correctTo, route.id]
    );

    console.log(`✅ ${route.name}`);
    console.log(`   YANGI FROM: ${correctFrom.substring(0, 50)}...`);
    console.log(`   YANGI TO: ${correctTo.substring(0, 50)}...\n`);
  }

  console.log('✅ Barcha tuman yo\'nalishlari to\'g\'rilandi!\n');

  // Tekshirish
  console.log('📊 TEKSHIRISH (G\'uzor):\n');
  const check = await query(
    'SELECT from_keywords, to_keywords FROM routes WHERE name = ?',
    ["Qashqadaryo (G'uzor) → Toshkent"]
  );

  if (check.length > 0) {
    console.log('FROM:', check[0].from_keywords.substring(0, 60) + '...');
    console.log('TO:', check[0].to_keywords.substring(0, 60) + '...');
  }

  process.exit(0);
})();
