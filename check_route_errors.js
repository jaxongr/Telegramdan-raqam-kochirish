const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== Barcha route SMS loglari statistikasi ===\n');

// Status breakdown
const statuses = db.prepare('SELECT status, COUNT(*) as count FROM route_sms_logs GROUP BY status').all();
console.log('Status breakdown:');
statuses.forEach(s => console.log(`  ${s.status}: ${s.count}`));

// Xatolar (agar error ustuni bor bo'lsa)
console.log('\n=== Eng ko\'p uchraydigan xatolar (TOP 5) ===');
const errors = db.prepare(`
  SELECT error, COUNT(*) as count
  FROM route_sms_logs
  WHERE status = 'failed' AND error IS NOT NULL
  GROUP BY error
  ORDER BY count DESC
  LIMIT 5
`).all();

if (errors.length > 0) {
  errors.forEach(e => {
    console.log(`  [${e.count}x] ${e.error}`);
  });
} else {
  console.log('  (Xatolar hali yozilmagan - yangi tizim)');
}

// Oxirgi 10 ta failed SMS
console.log('\n=== Oxirgi 10 ta failed SMS ===');
const recentFailed = db.prepare(`
  SELECT to_phone, error, sent_at
  FROM route_sms_logs
  WHERE status = 'failed'
  ORDER BY sent_at DESC
  LIMIT 10
`).all();

if (recentFailed.length > 0) {
  recentFailed.forEach(log => {
    console.log(`  ${log.sent_at} | ${log.to_phone} | ${log.error || 'No error msg'}`);
  });
} else {
  console.log('  (Failed SMS yo\'q)');
}

db.close();
