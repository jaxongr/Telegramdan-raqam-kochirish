const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 CHIROQCHI VA KITOB KALIT SO\'ZLARINI YANGILASH:\n');

  // 1. CHIROQCHI kalit so'zlarini boyitish
  const chiroqchiKeywords = 'chiroqchi, chiroqchiga, chiroqchidan, chirqchi, chiriqchi, чирқчи, чироқчи, чирокчи, chirokchi, chirokchiga, chirokchidan';
  
  // Toshkent → Qashqadaryo (Chiroqchi)
  await query(
    `UPDATE routes SET to_keywords = ? WHERE name = ?`,
    [chiroqchiKeywords, 'Toshkent → Qashqadaryo (Chiroqchi)']
  );
  console.log('✅ Toshkent → Qashqadaryo (Chiroqchi) TO keywords yangilandi');

  // Qashqadaryo (Chiroqchi) → Toshkent
  await query(
    `UPDATE routes SET from_keywords = ? WHERE name = ?`,
    [chiroqchiKeywords, 'Qashqadaryo (Chiroqchi) → Toshkent']
  );
  console.log('✅ Qashqadaryo (Chiroqchi) → Toshkent FROM keywords yangilandi');

  // 2. KITOB kalit so'zlarini yangilash (Yakkabog' ni olib tashlash)
  const kitobToKeywords = 'kitob, kitobga, китоб';
  const kitobFromKeywords = 'kitob, kitobdan, китоб';
  
  // Toshkent → Qashqadaryo (Kitob)
  await query(
    `UPDATE routes SET to_keywords = ? WHERE name = ?`,
    [kitobToKeywords, 'Toshkent → Qashqadaryo (Kitob)']
  );
  console.log('✅ Toshkent → Qashqadaryo (Kitob) TO keywords yangilandi (Yakkabog\' olib tashlandi)');

  // Qashqadaryo (Kitob) → Toshkent
  await query(
    `UPDATE routes SET from_keywords = ? WHERE name = ?`,
    [kitobFromKeywords, 'Qashqadaryo (Kitob) → Toshkent']
  );
  console.log('✅ Qashqadaryo (Kitob) → Toshkent FROM keywords yangilandi (Yakkabog\' olib tashlandi)');

  console.log('\n📋 YANGILANGAN KALIT SO\'ZLAR:\n');
  
  const routes = await query(
    `SELECT name, from_keywords, to_keywords FROM routes WHERE name LIKE '%Chiroqchi%' OR name LIKE '%Kitob%' ORDER BY name`
  );
  
  routes.forEach(r => {
    console.log(`${r.name}:`);
    console.log(`  FROM: ${r.from_keywords || 'N/A'}`);
    console.log(`  TO: ${r.to_keywords || 'N/A'}`);
    console.log('');
  });

  console.log('✅ Barcha o\'zgarishlar saqlandi!\n');
  process.exit(0);
})();
