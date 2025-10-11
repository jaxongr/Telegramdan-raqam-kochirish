const { query } = require('./src/database/sqlite');

(async () => {
  try {
    const groups = await query('SELECT id, name, telegram_id, active, sms_enabled FROM groups ORDER BY id');

    console.log('\n=== BARCHA GURUHLAR ===');
    console.log('ID | Active | SMS | Name');
    console.log('---|--------|-----|-----');
    groups.forEach(g => {
      const activeIcon = (g.active === 1 || g.active === true) ? '✓' : '✗';
      const smsIcon = (g.sms_enabled === 1 || g.sms_enabled === true) ? '✓' : '✗';
      console.log(`${g.id.toString().padStart(2)} | ${activeIcon.padEnd(6)} | ${smsIcon.padEnd(3)} | ${g.name}`);
    });

    const activeCount = groups.filter(g => g.active === 1 || g.active === true).length;
    const inactiveGroups = groups.filter(g => g.active !== 1 && g.active !== true);

    console.log(`\n=== XULOSA ===`);
    console.log(`Jami: ${groups.length} ta guruh`);
    console.log(`Active: ${activeCount} ta guruh`);
    console.log(`Inactive: ${inactiveGroups.length} ta guruh`);

    if (inactiveGroups.length > 0) {
      console.log('\n❌ INACTIVE GURUHLAR:');
      inactiveGroups.forEach(g => {
        console.log(`  ID: ${g.id} | ${g.name} | TG: ${g.telegram_id} | active=${g.active}`);
      });

      console.log('\n🔧 FIX: Barcha guruhlarni active qilish uchun:');
      console.log('   node fix_inactive_groups.js');
      console.log('\n   yoki SQL:');
      console.log('   UPDATE groups SET active = 1, sms_enabled = 1;');
    } else {
      console.log('\n✅ HAMMASI ACTIVE!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    process.exit(1);
  }
})();
