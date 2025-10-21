const { query } = require('./src/database/sqlite');

/**
 * Yo'nalish keywords larini to'g'rilash:
 * - Toshkent → Qashqadaryo: FROM=toshkentdan, TO=qarshiga (faqat "ga" variantlar)
 * - Qashqadaryo → Toshkent: FROM=qarshidan (faqat "dan" variantlar), TO=toshkentga
 */
(async () => {
  console.log('\n🔧 YO\'NALISH KEYWORDS LARINI TO\'G\'RILASH:\n');

  // ============ 1. TOSHKENT → QASHQADARYO ============

  console.log('1️⃣ Toshkent → Qashqadaryo:\n');

  // FROM: Toshkent keywords (dan/ga ikkalasi ham kerak)
  const toshkentFromKeywords = [
    'toshkent', 'toshkentga', 'toshkentdan', 'toshkent shahar',
    'тошкент', 'ташкent', 'tashkent', 'tashkentga', 'tashkentdan', 'tsh'
  ];

  // TO: Qashqadaryo tumanlar - FAQAT "ga" variantlar!
  const qashqadaryoToKeywords = [
    'qashqadaryo', 'qashqadaryo viloyati', 'qashqadaryoga', 'қашқадарё',
    'kashkadarya', 'qashqadaryo viloyat', 'qashqa',

    // Tumanlar - faqat "ga" variantlar
    'yakkabog', "yakkabog'", 'yakkabogʻ', 'yakkaboʻg', 'яккабог', 'yakkabogga',
    'qarshi', 'karshi', 'қарши', 'карши', 'qarshiga',
    'shahrisabz', 'shaxrisabz', 'шахрисабз', 'sabz', 'shahrisabzga',
    "g'uzor", 'guzor', 'gʻuzor', 'ғузор', 'гузор', 'guzorga',
    'koson', 'kason', 'косон', 'қосон', 'kosonga',
    'nishon', 'нишон', 'нишан', 'nishonga',
    'qamashi', 'kamashi', 'қамаши', 'камаши', 'qamashiga',
    'muborak', 'mubarok', 'муборак', 'мубарак', 'muborakga',
    'kasbi', 'kasby', 'касби', 'қасби', 'kasbiga',
    'dehqonobod', 'dexqonobod', 'деҳқонобод', 'дехқонобод', 'dehqanabad', 'dehqonobodga',
    'kitob', 'китоб', 'kitobga'
  ];

  await query(
    'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE name = ?',
    [toshkentFromKeywords.join(', '), qashqadaryoToKeywords.join(', '), 'Toshkent → Qashqadaryo']
  );

  console.log(`   FROM: ${toshkentFromKeywords.length} ta keyword`);
  console.log(`   TO: ${qashqadaryoToKeywords.length} ta keyword (faqat "ga" variantlar)`);
  console.log('   ✅ Yangilandi!\n');

  // ============ 2. QASHQADARYO → TOSHKENT ============

  console.log('2️⃣ Qashqadaryo → Toshkent:\n');

  // FROM: Qashqadaryo tumanlar - FAQAT "dan" variantlar!
  const qashqadaryoFromKeywords = [
    'qashqadaryo', 'qashqadaryo viloyati', 'qashqadaryodan', 'қашқадарё',
    'kashkadarya', 'qashqadaryo viloyat', 'qashqa',

    // Tumanlar - faqat "dan" variantlar
    'yakkabog', "yakkabog'", 'yakkabogʻ', 'yakkaboʻg', 'яккабог', 'yakkabogdan',
    'qarshi', 'karshi', 'қарши', 'карши', 'qarshidan',
    'shahrisabz', 'shaxrisabz', 'шахрисабз', 'sabz', 'shahrisabzdan',
    "g'uzor", 'guzor', 'gʻuzor', 'ғузор', 'гузор', 'guzordan',
    'koson', 'kason', 'косон', 'қосон', 'kosondan',
    'nishon', 'nishondan', 'нишон', 'нишан',
    'qamashi', 'kamashi', 'қамаши', 'камаши', 'qamashidan',
    'muborak', 'mubarok', 'муборак', 'мубарак', 'muborakdan',
    'kasbi', 'kasby', 'касби', 'қасби', 'kasbidan',
    'dehqonobod', 'dexqonobod', 'деҳқонобод', 'дехқонобод', 'dehqanabad', 'dehqonoboddan',
    'kitob', 'китоб', 'kitobdan'
  ];

  // TO: Toshkent keywords (dan/ga ikkalasi ham kerak)
  const toshkentToKeywords = [
    'toshkent', 'toshkentga', 'toshkentdan', 'toshkent shahar',
    'тошкент', 'ташкент', 'tashkent', 'tashkentga', 'tashkentdan', 'tsh'
  ];

  await query(
    'UPDATE routes SET from_keywords = ?, to_keywords = ? WHERE name = ?',
    [qashqadaryoFromKeywords.join(', '), toshkentToKeywords.join(', '), 'Qashqadaryo → Toshkent']
  );

  console.log(`   FROM: ${qashqadaryoFromKeywords.length} ta keyword (faqat "dan" variantlar)`);
  console.log(`   TO: ${toshkentToKeywords.length} ta keyword`);
  console.log('   ✅ Yangilandi!\n');

  // ============ TEKSHIRISH ============

  console.log('📊 TEKSHIRISH:\n');

  const route1 = await query('SELECT from_keywords, to_keywords FROM routes WHERE name = ?', ['Toshkent → Qashqadaryo']);
  console.log('Toshkent → Qashqadaryo:');
  console.log('  FROM:', route1[0].from_keywords.split(',').slice(0, 5).join(', ') + '...');
  console.log('  TO (qarshi):', route1[0].to_keywords.split(',').filter(k => k.includes('qarshi')).join(', '));

  const route2 = await query('SELECT from_keywords, to_keywords FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);
  console.log('\nQashqadaryo → Toshkent:');
  console.log('  FROM (qarshi):', route2[0].from_keywords.split(',').filter(k => k.includes('qarshi')).join(', '));
  console.log('  TO:', route2[0].to_keywords.split(',').slice(0, 5).join(', ') + '...');

  console.log('\n✅ Endi yo\'nalishlar to\'g\'ri ishlaydi:\n');
  console.log('   "Toshkentdan Qarshiga" → Toshkent → Qashqadaryo ✓');
  console.log('   "Qarshidan Toshkentga" → Qashqadaryo → Toshkent ✓\n');

  process.exit(0);
})();
