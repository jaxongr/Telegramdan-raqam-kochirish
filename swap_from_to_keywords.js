const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔄 FROM va TO KALIT SO\'ZLARNI ALMASHTIRYAPMAN:\n');

  // Barcha tumanlardan Toshkentga yo'nalishlar
  const routes = await query(`
    SELECT id, name, from_keywords, to_keywords
    FROM routes
    WHERE name LIKE 'Qashqadaryo (%)→ Toshkent'
    AND active = 1
  `);

  console.log(`${routes.length} ta yo'nalish topildi\n`);

  for (const route of routes) {
    const oldFrom = route.from_keywords;
    const oldTo = route.to_keywords;

    // FROM va TO ni almashtirish
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE id = ?',
      [oldTo, oldFrom, route.id]
    );

    console.log(`✅ ${route.name}`);
    console.log(`   ESKI FROM: ${oldFrom.substring(0, 40)}...`);
    console.log(`   ESKI TO: ${oldTo.substring(0, 40)}...`);
    console.log(`   YANGI FROM: ${oldTo.substring(0, 40)}...`);
    console.log(`   YANGI TO: ${oldFrom.substring(0, 40)}...\n`);
  }

  console.log('✅ FROM va TO almashtirildi!\n');

  // Tekshirish
  console.log('📊 TEKSHIRISH:\n');
  const check = await query('SELECT name, from_keywords, to_keywords FROM routes WHERE name LIKE ? LIMIT 2', ['Qashqadaryo (%)→ Toshkent']);

  check.forEach(r => {
    console.log(`${r.name}:`);
    console.log(`  FROM: ${r.from_keywords.substring(0, 60)}...`);
    console.log(`  TO: ${r.to_keywords.substring(0, 60)}...\n`);
  });

  process.exit(0);
})();
