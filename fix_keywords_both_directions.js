const { query } = require('./src/database/sqlite');

// Barcha Qashqadaryo tumanlarining keywordlari
const allDistrictsKeywords = [
  "qashqadaryo", "qashqadaryo viloyati", "qashqadaryoga", "qashqadaryodan",
  "қашқадарё", "kashkadarya", "qashqadaryo viloyat", "qashqa",

  // Barcha tumanlar
  "yakkabog", "yakkabog'", "yakkabogʻ", "yakkaboʻg", "яккабог", "yakkabogga", "yakkabogdan",
  "qarshi", "karshi", "қарши", "карши", "qarshiga", "qarshidan",
  "shahrisabz", "shaxrisabz", "шахрисабз", "sabz", "shahrisabzga", "shahrisabzdan",
  "g'uzor", "guzor", "gʻuzor", "ғузор", "гузор", "guzorga", "guzordan",
  "koson", "kason", "косон", "қосон", "kosonga", "kosondan",
  "nishon", "nishondan", "нишон", "нишан", "nishonga",
  "qamashi", "kamashi", "қамаши", "камаши", "qamashiga", "qamashidan",
  "muborak", "mubarok", "муборак", "мубарак", "muborakga", "muborakdan",
  "kasbi", "kasby", "касби", "қасби", "kasbiga", "kasbidan",
  "dehqonobod", "dexqonobod", "деҳқонобод", "дехқонобод", "dehqanabad", "dehqonobodga", "dehqonoboddan",
  "kitob", "китоб", "kitobga", "kitobdan"
].join(', ');

const toshkentKeywords = "toshkent, toshkentga, toshkentdan, toshkent shahar, тошкент, ташкент, tashkent, tsh";

(async () => {
  console.log('\n🔧 KALIT SO\'ZLARNI TO\'G\'RILASH:\n');

  // 1. "Toshkent → Qashqadaryo" - TO ga barcha tumanlar
  await query(
    'UPDATE routes SET to_keywords = ? WHERE name = ?',
    [allDistrictsKeywords, 'Toshkent → Qashqadaryo']
  );
  console.log('✅ "Toshkent → Qashqadaryo" - TO keywordlarga barcha tumanlar qo\'shildi');

  // 2. "Qashqadaryo → Toshkent" (asosiy) - FROM ga barcha tumanlar
  await query(
    'UPDATE routes SET from_keywords = ? WHERE name = ?',
    [allDistrictsKeywords, 'Qashqadaryo → Toshkent']
  );
  console.log('✅ "Qashqadaryo → Toshkent" - FROM keywordlarga barcha tumanlar qo\'shildi');

  // 3. Barcha tumanlar yo'nalishlarini ham yangilash (agar active bo'lsa)
  const districtRoutes = await query(
    'SELECT id, name FROM routes WHERE name LIKE ? AND active = 1',
    ['Qashqadaryo (%)→ Toshkent']
  );

  console.log(`\n🔄 ${districtRoutes.length} ta tuman yo'nalishi yangilanmoqda:\n`);

  for (const route of districtRoutes) {
    // Har bir tuman uchun o'z keywordini olish
    const districtName = route.name.match(/\((.*?)\)/)?.[1];
    if (!districtName) continue;

    // Bu tuman keywordlarini ajratib olish
    let districtKeywords = '';

    if (districtName.includes('Yakkabog')) {
      districtKeywords = 'yakkabog, yakkabog\', yakkabogʻ, yakkaboʻg, яккабог, yakkabogga, yakkabogdan';
    } else if (districtName.includes('Qarshi')) {
      districtKeywords = 'qarshi, karshi, қарши, карши, qarshiga, qarshidan';
    } else if (districtName.includes('Shahrisabz')) {
      districtKeywords = 'shahrisabz, shaxrisabz, шахрисабз, sabz, shahrisabzga, shahrisabzdan, kitob, китоб';
    } else if (districtName.includes('G\'uzor') || districtName.includes('Guzor')) {
      districtKeywords = 'g\'uzor, guzor, gʻuzor, ғузор, гузор, guzorga, guzordan';
    } else if (districtName.includes('Koson')) {
      districtKeywords = 'koson, kason, косон, қосон, kosonga, kosondan';
    } else if (districtName.includes('Nishon')) {
      districtKeywords = 'nishon, nishondan, нишон, нишан, nishonga';
    } else if (districtName.includes('Qamashi')) {
      districtKeywords = 'qamashi, kamashi, қамаши, камаши, qamashiga, qamashidan';
    } else if (districtName.includes('Muborak')) {
      districtKeywords = 'muborak, mubarok, муборак, мубарак, muborakga, muborakdan';
    } else if (districtName.includes('Kasbi')) {
      districtKeywords = 'kasbi, kasby, касби, қасби, kasbiga, kasbidan';
    } else if (districtName.includes('Dehqonobod')) {
      districtKeywords = 'dehqonobod, dexqonobod, деҳқонобод, дехқонобод, dehqanabad, dehqonobodga, dehqonoboddan';
    }

    if (districtKeywords) {
      await query(
        'UPDATE routes SET from_keywords = ? WHERE id = ?',
        [districtKeywords, route.id]
      );
      console.log(`  ✅ ${route.name}`);
    }
  }

  console.log('\n✅ Barcha kalit so\'zlar to\'g\'rilandi!\n');

  // Natijani ko'rsatish
  console.log('📊 TEKSHIRISH:\n');

  const check1 = await query('SELECT from_keywords, to_keywords FROM routes WHERE name = ?', ['Toshkent → Qashqadaryo']);
  console.log('Toshkent → Qashqadaryo:');
  console.log('  FROM:', check1[0].from_keywords.substring(0, 60) + '...');
  console.log('  TO:', check1[0].to_keywords.substring(0, 60) + '...');

  const check2 = await query('SELECT from_keywords, to_keywords FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);
  console.log('\nQashqadaryo → Toshkent:');
  console.log('  FROM:', check2[0].from_keywords.substring(0, 60) + '...');
  console.log('  TO:', check2[0].to_keywords.substring(0, 60) + '...');

  process.exit(0);
})();
