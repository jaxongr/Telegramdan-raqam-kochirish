const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n📊 OXIRGI 20 TA SMS LOG:\n');

  const logs = await query(`
    SELECT
      datetime(sent_at, 'localtime') as local_time,
      to_phone,
      status
    FROM sms_logs
    ORDER BY sent_at DESC
    LIMIT 20
  `);

  logs.forEach((log, idx) => {
    const status_icon = log.status === 'success' ? '✅'
      : log.status === 'cooldown' ? '⏸'
      : log.status === 'pending' ? '⏳'
      : '❌';

    console.log(`${idx + 1}. ${status_icon} ${log.to_phone} - ${log.status} (${log.local_time})`);
  });

  // Cooldown larni sanash
  const cooldown_count = logs.filter(l => l.status === 'cooldown').length;
  const success_count = logs.filter(l => l.status === 'success').length;
  const pending_count = logs.filter(l => l.status === 'pending').length;

  console.log(`\n📈 STATISTIKA (oxirgi 20 ta):`);
  console.log(`   ✅ Success: ${success_count}`);
  console.log(`   ⏸ Cooldown: ${cooldown_count}`);
  console.log(`   ⏳ Pending: ${pending_count}`);

  process.exit(0);
})();
