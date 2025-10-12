const { getAllGroups } = require('/root/telegram-sms/src/database/models');

(async () => {
  const groups = await getAllGroups();

  console.log('=== Bazadagi BARCHA guruhlar ===\n');
  console.log('Jami: ' + groups.length + ' ta\n');

  const active = groups.filter(g => g.active);
  const inactive = groups.filter(g => !g.active);

  console.log('Active: ' + active.length + ' ta');
  console.log('Inactive: ' + inactive.length + ' ta\n');

  console.log('ACTIVE guruhlar:');
  active.forEach((g, i) => {
    console.log('  ' + (i+1) + '. ' + g.name + ' | TG: ' + g.telegram_id);
  });

  if (inactive.length > 0) {
    console.log('\nINACTIVE guruhlar:');
    inactive.forEach((g, i) => {
      console.log('  ' + (i+1) + '. ' + g.name + ' | TG: ' + g.telegram_id);
    });
  }

  process.exit(0);
})();
