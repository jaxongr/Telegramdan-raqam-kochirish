const { query } = require('./src/database/sqlite');

/**
 * Tuman yo'nalishlarida FROM keywords ichidan "ga" variantlarni olib tashlash
 * Faqat "dan" variantlari va asosiy nomlarni qoldirish
 */
(async () => {
  console.log('\n🔧 TUMAN YO\'NALISHLARIDAN "GA" VARIANTLARNI OLIB TASHLASH:\n');

  // Barcha tuman yo'nalishlari
  const routes = await query(`
    SELECT id, name, from_keywords, to_keywords
    FROM routes
    WHERE name LIKE 'Qashqadaryo (%) → Toshkent'
    AND active = 1
  `);

  console.log(`Topildi: ${routes.length} ta tuman yo'nalishi\n`);

  for (const route of routes) {
    // FROM keywords dan "ga" variantlarni olib tashlash
    const fromKeywords = route.from_keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => {
        const lower = k.toLowerCase();
        // "ga/га" bilan tugaydigan keywordlarni olib tashlash
        return !lower.endsWith('ga') &&
               !lower.endsWith('га') &&
               !lower.endsWith('ка');
      });

    // TO keywords o'zgarishsiz (toshkent)
    const toKeywords = route.to_keywords.split(',').map(k => k.trim());

    // Yangilash
    await query(
      'UPDATE routes SET from_keywords = ? WHERE id = ?',
      [fromKeywords.join(', '), route.id]
    );

    console.log(`✅ ${route.name}`);
    console.log(`   FROM: ${route.from_keywords.split(',').length} → ${fromKeywords.length} ta keyword (olib tashlandi: ${route.from_keywords.split(',').length - fromKeywords.length})`);
  }

  console.log('\n✅ Barcha tuman yo\'nalishlari yangilandi!\n');

  // Tekshirish
  console.log('📊 TEKSHIRISH:\n');

  const check1 = await query(
    'SELECT from_keywords FROM routes WHERE name = ?',
    ["Qashqadaryo (Yakkabog') → Toshkent"]
  );
  console.log('Yakkabog\' → Toshkent FROM:');
  console.log(check1[0].from_keywords);

  const check2 = await query(
    'SELECT to_keywords FROM routes WHERE name = ?',
    ['Toshkent → Qashqadaryo']
  );
  console.log('\nToshkent → Qashqadaryo TO (yakkabog):');
  const yakkabogKeywords = check2[0].to_keywords.split(',').filter(k => k.toLowerCase().includes('yakkabog'));
  console.log(yakkabogKeywords.join(', '));

  process.exit(0);
})();
