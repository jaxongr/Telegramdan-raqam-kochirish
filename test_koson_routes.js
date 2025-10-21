const { query } = require('./src/database/sqlite');

(async () => {
  const koson1 = await query('SELECT id, name, from_keywords, to_keywords FROM routes WHERE name = ?', ['Toshkent → Qashqadaryo (Koson)']);

  console.log('1️⃣ TOSHKENT → QASHQADARYO (KOSON):');
  console.log('   ID:', koson1[0].id);
  console.log('   FROM:', koson1[0].from_keywords);
  console.log('   TO:', koson1[0].to_keywords);

  const koson2 = await query('SELECT id, name, from_keywords, to_keywords FROM routes WHERE name = ?', ['Qashqadaryo (Koson) → Toshkent']);

  console.log('\n2️⃣ QASHQADARYO (KOSON) → TOSHKENT:');
  console.log('   ID:', koson2[0].id);
  console.log('   FROM:', koson2[0].from_keywords.substring(0, 80));
  console.log('   TO:', koson2[0].to_keywords.substring(0, 80));

  console.log('\n✅ ID FARQ:', koson1[0].id !== koson2[0].id ? 'BOR (to\'g\'ri!)' : 'YO\'Q (xato!)');
  console.log(`   ${koson1[0].id} ≠ ${koson2[0].id}`);

  process.exit(0);
})();
