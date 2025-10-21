const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n📊 STATISTIKA TEST:\n');

  // Jami raqamlar
  const total = await query('SELECT COUNT(*) as count FROM phones');
  console.log('Jami raqamlar:', total[0].count);

  // Unikal telefon raqamlar
  const unique = await query('SELECT COUNT(DISTINCT phone) as count FROM phones');
  console.log('Unikal telefon raqamlar:', unique[0].count);

  // Umrbod unikal
  const lifetime = await query('SELECT COUNT(*) as count FROM phones WHERE lifetime_unique = 1');
  console.log('Umrbod unikal:', lifetime[0].count);

  // Jami ko\'rinishlar (SUM repeat_count)
  const appearances = await query('SELECT SUM(repeat_count) as sum FROM phones');
  console.log('Jami ko\'rinishlar (SUM):', appearances[0].sum);

  // Repeat count bo'yicha taqsimot
  console.log('\n📈 Takrorlanish bo\'yicha:');
  const distribution = await query(`
    SELECT repeat_count, COUNT(*) as count
    FROM phones
    GROUP BY repeat_count
    ORDER BY repeat_count DESC
    LIMIT 10
  `);
  distribution.forEach(row => {
    console.log(`  ${row.repeat_count} marta: ${row.count} ta raqam`);
  });

  // Top 5 eng ko'p takrorlangan
  console.log('\n🔝 Eng ko\'p takrorlangan 5 ta raqam:');
  const top = await query(`
    SELECT phone, repeat_count, group_id
    FROM phones
    ORDER BY repeat_count DESC
    LIMIT 5
  `);
  top.forEach(row => {
    console.log(`  ${row.phone}: ${row.repeat_count} marta (group: ${row.group_id})`);
  });

  process.exit(0);
})();
