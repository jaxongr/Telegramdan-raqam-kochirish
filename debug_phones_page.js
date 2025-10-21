const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔍 PHONES SAHIFA DEBUG:\n');

  // Phones jadvalidagi ma'lumotlar
  const phones = await query(`
    SELECT
      p.*,
      g.name as group_name
    FROM phones p
    LEFT JOIN groups g ON p.group_id = g.id
    ORDER BY p.last_date DESC
    LIMIT 20
  `);

  console.log('📋 Birinchi 20 ta raqam:\n');
  phones.forEach((phone, idx) => {
    console.log(`${idx + 1}. ${phone.phone}`);
    console.log(`   Guruh: ${phone.group_name || 'N/A'}`);
    console.log(`   Takror: ${phone.repeat_count} marta`);
    console.log(`   Birinchi: ${phone.first_date}`);
    console.log(`   Oxirgi: ${phone.last_date}`);
    console.log(`   Lifetime unique: ${phone.lifetime_unique}`);
    console.log('');
  });

  // Takrorlanish bo'yicha statistika
  const stats = await query(`
    SELECT
      MIN(repeat_count) as min,
      MAX(repeat_count) as max,
      AVG(repeat_count) as avg,
      COUNT(*) as total
    FROM phones
  `);

  console.log('📊 Takrorlanish statistikasi:');
  console.log(`   Min: ${stats[0].min}`);
  console.log(`   Max: ${stats[0].max}`);
  console.log(`   O'rtacha: ${stats[0].avg.toFixed(2)}`);
  console.log(`   Jami: ${stats[0].total}`);

  // Repeat_count > 1 bo'lganlar
  const repeated = await query(`
    SELECT COUNT(*) as count
    FROM phones
    WHERE repeat_count > 1
  `);

  console.log(`\n🔁 1 dan ortiq takrorlangan: ${repeated[0].count} ta\n`);

  process.exit(0);
})();
