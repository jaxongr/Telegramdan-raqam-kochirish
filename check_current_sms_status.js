const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== HOZIRGI SMS HOLATI (Oxirgi 30 daqiqa) ===\n');

const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

// 1. Oxirgi 30 daqiqa statistikasi
console.log('1. Oxirgi 30 daqiqa statistikasi:');

const recent = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ?
  GROUP BY status
`).all(thirtyMinAgo);

let total = 0;
recent.forEach(s => {
  console.log(`   ${s.status}: ${s.count}`);
  total += s.count;
});

console.log(`   JAMI: ${total}`);

if (total > 0) {
  const success = recent.find(s => s.status === 'success')?.count || 0;
  const failed = recent.find(s => s.status === 'failed')?.count || 0;
  const cooldown = recent.find(s => s.status === 'cooldown')?.count || 0;

  console.log(`\n   Success rate: ${((success / total) * 100).toFixed(1)}%`);
  console.log(`   Failed rate: ${((failed / total) * 100).toFixed(1)}%`);
  console.log(`   Cooldown rate: ${((cooldown / total) * 100).toFixed(1)}%`);
}

// 2. Oxirgi 20 ta SMS (barcha statuslar)
console.log('\n2. Oxirgi 20 ta SMS (barcha statuslar):');

const allRecent = db.prepare(`
  SELECT to_phone, status, error, sent_at
  FROM sms_logs
  ORDER BY sent_at DESC
  LIMIT 20
`).all();

allRecent.forEach(log => {
  const time = log.sent_at ? log.sent_at.substring(11, 19) : 'N/A';
  const status = log.status === 'success' ? '✅' : log.status === 'cooldown' ? '⏸️' : '❌';
  const error = log.error ? ` | ${log.error.substring(0, 50)}` : '';
  console.log(`   ${time} ${status} ${log.to_phone} | ${log.status}${error}`);
});

// 3. Hozirgi FAILED xatolar (oxirgi 30 daqiqa)
console.log('\n3. FAILED xatolar (oxirgi 30 daqiqa):');

const failedErrors = db.prepare(`
  SELECT error, COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ? AND status = 'failed'
  GROUP BY error
  ORDER BY count DESC
`).all(thirtyMinAgo);

if (failedErrors.length > 0) {
  failedErrors.forEach(e => {
    console.log(`   [${e.count}x] ${e.error || 'NULL'}`);
  });
} else {
  console.log('   (Failed xatolar yo\'q - ajoyib!)');
}

// 4. SemySMS telefonlar holati
console.log('\n4. SemySMS telefonlar holati:');

const phones = db.prepare('SELECT phone, status, balance, last_used, total_sent FROM semysms_phones').all();

phones.forEach(p => {
  const lastUsed = p.last_used ? new Date(p.last_used + 'Z').toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' }) : 'Never';
  console.log(`   ${p.phone} | ${p.status} | Balance: ${p.balance || 'NULL'} | Last: ${lastUsed} | Sent: ${p.total_sent}`);
});

db.close();
