const { getAllGroups } = require('/root/telegram-sms/src/database/models');

(async () => {
  const groups = await getAllGroups();

  console.log('=== Bazadagi guruhlar ===\n');
  console.log('Jami: ' + groups.length + ' ta\n');

  groups.forEach((g, i) => {
    console.log((i+1) + '. ID=' + g.id + ' | ' + g.name);
    console.log('   TG: ' + g.telegram_id + ' | Active: ' + (g.active ? 'HA' : 'YOQ'));
  });

  process.exit(0);
})();
