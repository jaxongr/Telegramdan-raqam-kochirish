const { query } = require('/root/telegram-sms/src/database/sqlite');

(async () => {
  console.log('=== Chiroqchi xabarlari (sample 5) ===\n');

  const phones = await query(
    'SELECT phone, last_message FROM phones WHERE last_message LIKE ? LIMIT 5',
    ['%chiroqchi%']
  );

  phones.forEach((p, i) => {
    console.log((i+1) + '. ' + p.phone);
    console.log('   ' + p.last_message.substring(0, 150) + '...\n');
  });

  console.log('\n=== Koson xabarlari (sample 3) ===\n');

  const kosonPhones = await query(
    'SELECT phone, last_message FROM phones WHERE last_message LIKE ? LIMIT 3',
    ['%koson%']
  );

  kosonPhones.forEach((p, i) => {
    console.log((i+1) + '. ' + p.phone);
    console.log('   ' + p.last_message.substring(0, 150) + '...\n');
  });

  process.exit(0);
})();
