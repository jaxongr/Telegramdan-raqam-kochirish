const { query } = require('/root/telegram-sms/src/database/sqlite');

(async () => {
  // Bir xil telegram_id bilan 2 ta guruh bormi?
  const duplicates = await query(`
    SELECT telegram_id, COUNT(*) as count
    FROM groups
    GROUP BY telegram_id
    HAVING count > 1
  `);

  console.log('=== Dublikat telegram_id ===\n');

  if (duplicates.length > 0) {
    console.log('XATO: ' + duplicates.length + ' ta dublikat topildi!\n');
    for (const d of duplicates) {
      const count = d.count || d.COUNT;
      console.log('  ' + d.telegram_id + ' - ' + count + ' marta');

      // Shu ID bilan barcha guruhlarni ko'rsatish
      const groups = await query('SELECT id, name, active FROM groups WHERE telegram_id = ?', [d.telegram_id]);
      groups.forEach(g => {
        console.log('    -> ID=' + g.id + ' | ' + g.name + ' | active=' + g.active);
      });
    }
  } else {
    console.log('✅ Dublikatlar yoq\n');
  }

  process.exit(0);
})();
