const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== Muammoli Telefon Raqamlar Tahlili ===\n');

const problemPhones = ['+998952220886', '+998933873307', '+998997069229'];

problemPhones.forEach(phone => {
  console.log(`\n📞 ${phone}:`);
  console.log('─'.repeat(60));

  // Status breakdown
  const stats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM sms_logs
    WHERE to_phone = ?
    GROUP BY status
  `).all(phone);

  console.log('  Umumiy:');
  stats.forEach(s => {
    console.log(`    ${s.status}: ${s.count}`);
  });

  // Bugungi breakdown
  const today = new Date().toISOString().split('T')[0];

  const todayStats = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM sms_logs
    WHERE to_phone = ? AND DATE(sent_at) = ?
    GROUP BY status
  `).all(phone, today);

  console.log('\n  Bugun:');
  todayStats.forEach(s => {
    console.log(`    ${s.status}: ${s.count}`);
  });

  // Oxirgi 5 ta urinish
  console.log('\n  Oxirgi 5 ta urinish:');
  const recent = db.prepare(`
    SELECT sent_at, status, error
    FROM sms_logs
    WHERE to_phone = ?
    ORDER BY sent_at DESC
    LIMIT 5
  `).all(phone);

  recent.forEach(log => {
    const time = log.sent_at.substring(11, 19);
    const statusIcon = log.status === 'success' ? '✅' : log.status === 'cooldown' ? '⏸️' : '❌';
    const error = log.error ? ` - ${log.error.substring(0, 40)}` : '';
    console.log(`    ${time} ${statusIcon} ${log.status}${error}`);
  });

  // Oxirgi success
  const lastSuccess = db.prepare(`
    SELECT sent_at
    FROM sms_logs
    WHERE to_phone = ? AND status = 'success'
    ORDER BY sent_at DESC
    LIMIT 1
  `).get(phone);

  if (lastSuccess) {
    const successDate = new Date(lastSuccess.sent_at + 'Z');
    const hoursAgo = ((Date.now() - successDate.getTime()) / (1000 * 60 * 60)).toFixed(1);
    console.log(`\n  Oxirgi success: ${lastSuccess.sent_at} (${hoursAgo} soat oldin)`);
  } else {
    console.log(`\n  Oxirgi success: Yo'q (hech qachon success bo'lmagan)`);
  }
});

db.close();
