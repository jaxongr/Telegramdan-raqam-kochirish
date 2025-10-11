const { query } = require('./src/database/sqlite');

(async () => {
  try {
    // Oxirgi 10 daqiqada topilgan raqamlar
    const recent = await query(`
      SELECT group_id, COUNT(*) as count
      FROM phones
      WHERE datetime(first_date) > datetime('now', '-10 minutes')
      GROUP BY group_id
      ORDER BY count DESC
    `);

    console.log('\n=== OXIRGI 10 DAQIQADA TOPILGAN RAQAMLAR ===\n');
    console.log('Group ID | Count');
    console.log('---------|-------');

    if (recent.length === 0) {
      console.log('Hech qanday yangi raqam topilmadi\n');
    } else {
      recent.forEach(row => {
        console.log(`${row.group_id.toString().padStart(8)} | ${row.count}`);
      });
      console.log(`\nJami: ${recent.reduce((sum, r) => sum + r.count, 0)} ta raqam`);
    }

    // Oxirgi 30 daqiqada qaysi guruhlardan xabarlar kelgan
    const groups30min = await query(`
      SELECT DISTINCT group_id
      FROM phones
      WHERE datetime(first_date) > datetime('now', '-30 minutes')
    `);

    console.log(`\n✅ Oxirgi 30 daqiqada ${groups30min.length} ta guruhdan xabar keldi\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error);
    process.exit(1);
  }
})();
