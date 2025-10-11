const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('=== 1. AVVAL HOLATINI TEKSHIRISH ===\n');

    const groups = await query('SELECT id, name, telegram_id, active, sms_enabled FROM groups ORDER BY id');
    console.log(`Jami guruhlar: ${groups.length} ta\n`);

    const activeGroups = groups.filter(g => g.active === 1 || g.active === true);
    const inactiveGroups = groups.filter(g => g.active !== 1 && g.active !== true);

    console.log(`Active: ${activeGroups.length} ta guruh`);
    console.log(`Inactive: ${inactiveGroups.length} ta guruh\n`);

    if (inactiveGroups.length > 0) {
      console.log('=== INACTIVE GURUHLAR ===');
      inactiveGroups.forEach(g => {
        console.log(`  ID: ${g.id} | ${g.name} | TG: ${g.telegram_id} | active=${g.active}`);
      });
      console.log();
    }

    // FIX: Barcha guruhlarni active qilish
    console.log('=== 2. BARCHA GURUHLARNI ACTIVE QILISH ===\n');

    const result = await query('UPDATE groups SET active = 1, sms_enabled = 1 WHERE active != 1 OR active IS NULL');
    console.log(`✓ ${result.changes || 0} ta guruh yangilandi\n`);

    // Tekshirish
    console.log('=== 3. YANGILANGAN HOLATNI TEKSHIRISH ===\n');

    const updatedGroups = await query('SELECT id, name, telegram_id, active, sms_enabled FROM groups ORDER BY id');
    const nowActive = updatedGroups.filter(g => g.active === 1 || g.active === true);
    const nowInactive = updatedGroups.filter(g => g.active !== 1 && g.active !== true);

    console.log(`Active: ${nowActive.length} ta guruh`);
    console.log(`Inactive: ${nowInactive.length} ta guruh\n`);

    if (nowInactive.length > 0) {
      console.log('⚠️ HALI HAM INACTIVE GURUHLAR BOR:');
      nowInactive.forEach(g => {
        console.log(`  ID: ${g.id} | ${g.name} | active=${g.active}`);
      });
    } else {
      console.log('✅ HAMMASI ACTIVE!');
      console.log('✅ Endi monitoring 25 ta guruhni ham kuzatishi kerak');
      console.log('\n👉 PM2 restart qiling: pm2 restart telegram-sms');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
