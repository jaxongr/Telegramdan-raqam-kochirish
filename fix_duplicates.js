const { query } = require('/root/telegram-sms/src/database/sqlite');

(async () => {
  console.log('=== Dublikatlarni tuzatish ===\n');

  // 1. ID=null bo'lgan barcha guruhlarni o'chirish
  const nullGroups = await query('SELECT * FROM groups WHERE id IS NULL');
  console.log('ID=null guruhlar: ' + nullGroups.length + ' ta\n');

  if (nullGroups.length > 0) {
    console.log('O\'chirilmoqda...');
    await query('DELETE FROM groups WHERE id IS NULL');
    console.log('✅ ' + nullGroups.length + ' ta ID=null guruh o\'chirildi\n');
  }

  // 2. Qolgan dublikatlarni tekshirish
  const duplicates = await query(`
    SELECT telegram_id, COUNT(*) as count
    FROM groups
    GROUP BY telegram_id
    HAVING count > 1
  `);

  if (duplicates.length > 0) {
    console.log('Hali ham ' + duplicates.length + ' ta dublikat bor:');
    for (const d of duplicates) {
      const groups = await query('SELECT id, name FROM groups WHERE telegram_id = ? ORDER BY id', [d.telegram_id]);
      console.log('\n  ' + d.telegram_id + ':');
      groups.forEach((g, i) => {
        if (i === 0) {
          console.log('    ✅ QOLDIRILADI: ID=' + g.id + ' | ' + g.name);
        } else {
          console.log('    ❌ O\'CHIRILADI: ID=' + g.id + ' | ' + g.name);
        }
      });

      // Birinchisidan boshqa hammasini o'chirish
      const keepId = groups[0].id;
      await query('DELETE FROM groups WHERE telegram_id = ? AND id != ?', [d.telegram_id, keepId]);
    }
    console.log('\n✅ Barcha dublikatlar o\'chirildi!');
  } else {
    console.log('✅ Dublikatlar yo\'q');
  }

  // 3. Yakuniy natija
  const finalGroups = await query('SELECT COUNT(*) as count FROM groups');
  console.log('\n=== Yakuniy natija ===');
  console.log('Jami guruhlar: ' + (finalGroups[0].count || finalGroups[0].COUNT) + ' ta');

  process.exit(0);
})();
