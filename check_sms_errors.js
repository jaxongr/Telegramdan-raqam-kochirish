const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== SMS Logs Xatolari Tahlili ===\n');

// 1. Umumiy statistika
console.log('1. Umumiy statistika (bugun):');
const today = new Date().toISOString().split('T')[0];

const stats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM sms_logs
  WHERE DATE(sent_at) = ?
  GROUP BY status
`).all(today);

stats.forEach(s => {
  console.log(`   ${s.status}: ${s.count}`);
});

const total = stats.reduce((sum, s) => sum + s.count, 0);
const success = stats.find(s => s.status === 'success')?.count || 0;
const cooldown = stats.find(s => s.status === 'cooldown')?.count || 0;
const failed = stats.find(s => s.status === 'failed')?.count || 0;

console.log(`\n   Jami: ${total}`);
console.log(`   Success rate: ${total > 0 ? ((success / total) * 100).toFixed(1) : 0}%`);
console.log(`   Cooldown block rate: ${total > 0 ? ((cooldown / total) * 100).toFixed(1) : 0}%`);

// 2. Eng ko'p uchraydigan xatolar
console.log('\n2. Eng ko\'p uchraydigan xatolar (bugun, TOP 10):');

const errors = db.prepare(`
  SELECT error, COUNT(*) as count
  FROM sms_logs
  WHERE DATE(sent_at) = ? AND status != 'success' AND error IS NOT NULL
  GROUP BY error
  ORDER BY count DESC
  LIMIT 10
`).all(today);

if (errors.length > 0) {
  errors.forEach(e => {
    console.log(`   [${e.count}x] ${e.error}`);
  });
} else {
  console.log('   (Xatolar yo\'q yoki NULL)');
}

// 3. Oxirgi 20 ta xatoli SMS
console.log('\n3. Oxirgi 20 ta xatoli SMS:');

const recent = db.prepare(`
  SELECT to_phone, status, error, sent_at
  FROM sms_logs
  WHERE status != 'success'
  ORDER BY sent_at DESC
  LIMIT 20
`).all();

if (recent.length > 0) {
  recent.forEach(log => {
    const time = log.sent_at ? log.sent_at.substring(11, 19) : 'N/A';
    const error = log.error || '(no error msg)';
    console.log(`   ${time} | ${log.to_phone} | ${log.status} | ${error}`);
  });
} else {
  console.log('   (Xatolar yo\'q)');
}

// 4. Cooldown tekshirish (2 soatlik limit ishlayaptimi?)
console.log('\n4. Cooldown statistikasi (oxirgi 1 soat):');

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const cooldownStats = db.prepare(`
  SELECT COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ? AND status = 'cooldown'
`).all(oneHourAgo);

console.log(`   Oxirgi 1 soatda cooldown: ${cooldownStats[0].count}`);

// Eng ko'p cooldown bo'lgan raqamlar
const topCooldown = db.prepare(`
  SELECT to_phone, COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ? AND status = 'cooldown'
  GROUP BY to_phone
  ORDER BY count DESC
  LIMIT 5
`).all(oneHourAgo);

if (topCooldown.length > 0) {
  console.log('\n   Eng ko\'p cooldown bo\'lgan raqamlar:');
  topCooldown.forEach(p => {
    console.log(`     ${p.to_phone}: ${p.count} marta`);
  });
}

db.close();
