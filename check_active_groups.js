const { query } = require('./src/database/sqlite');

(async () => {
  try {
    const groups = await query('SELECT id, name, telegram_id, active, sms_enabled FROM groups ORDER BY id');

    console.log('=== BARCHA GURUHLAR ===\n');
    console.log('ID | Active | SMS | Name');
    console.log('----------------------------------------');

    groups.forEach(g => {
      console.log(`${g.id} | ${g.active} | ${g.sms_enabled} | ${g.name}`);
    });

    console.log('\n========================================');
    console.log(`JAMI: ${groups.length} ta guruh`);

    const activeGroups = groups.filter(g => g.active === 1 || g.active === true);
    const inactiveGroups = groups.filter(g => g.active !== 1 && g.active !== true);

    console.log(`Active: ${activeGroups.length} ta guruh`);
    console.log(`Inactive: ${inactiveGroups.length} ta guruh`);

    if (inactiveGroups.length > 0) {
      console.log('\n=== INACTIVE GURUHLAR ===');
      inactiveGroups.forEach(g => {
        console.log(`ID: ${g.id} | Name: ${g.name} | TG: ${g.telegram_id} | Active: ${g.active}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
