const { query } = require('/root/telegram-sms/src/database/sqlite');

(async () => {
  console.log('=== Oxirgi 30 daqiqadagi raqamlar ===\n');

  const phones30 = await query(
    `SELECT COUNT(*) as count FROM phones WHERE last_date >= datetime('now', '-30 minutes', 'localtime')`
  );

  console.log('Oxirgi 30 daqiqa: ' + (phones30[0].count || phones30[0].COUNT || 0) + ' ta');

  const phones5 = await query(
    `SELECT COUNT(*) as count FROM phones WHERE last_date >= datetime('now', '-5 minutes', 'localtime')`
  );

  console.log('Oxirgi 5 daqiqa: ' + (phones5[0].count || phones5[0].COUNT || 0) + ' ta');

  console.log('\n=== Qashqadaryo oxirgi 30 daqiqa ===\n');

  const qashqadaryo = await query(`
    SELECT COUNT(*) as count
    FROM phones p
    JOIN groups g ON p.group_id = g.id
    WHERE p.last_date >= datetime('now', '-30 minutes', 'localtime')
    AND (
      p.last_message LIKE '%qarshi%' OR
      p.last_message LIKE '%yakkabog%' OR
      p.last_message LIKE '%guzor%' OR
      p.last_message LIKE '%kitob%' OR
      p.last_message LIKE '%shahrisabz%' OR
      p.last_message LIKE '%chiroqchi%'
    )
  `);

  console.log('Qashqadaryo xabarlari: ' + (qashqadaryo[0].count || qashqadaryo[0].COUNT || 0) + ' ta');

  process.exit(0);
})();
