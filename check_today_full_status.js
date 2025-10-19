const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== BUGUNGI TO\'LIQ STATISTIKA ===\n');

const today = new Date().toISOString().split('T')[0];

// 1. Umumiy
console.log('1. Umumiy statistika (bugun):');

const stats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM sms_logs
  WHERE DATE(sent_at) = ?
  GROUP BY status
`).all(today);

let total = 0;
stats.forEach(s => {
  console.log(`   ${s.status}: ${s.count}`);
  total += s.count;
});

console.log(`\n   JAMI: ${total}`);

if (total > 0) {
  const success = stats.find(s => s.status === 'success')?.count || 0;
  const failed = stats.find(s => s.status === 'failed')?.count || 0;
  const cooldown = stats.find(s => s.status === 'cooldown')?.count || 0;
  const blocked = stats.find(s => s.status === 'blocked')?.count || 0;

  console.log(`\n   ✅ Success: ${success} (${((success / total) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${failed} (${((failed / total) * 100).toFixed(1)}%)`);
  console.log(`   ⏸️ Cooldown: ${cooldown} (${((cooldown / total) * 100).toFixed(1)}%)`);
  if (blocked > 0) {
    console.log(`   🚫 Blocked: ${blocked} (${((blocked / total) * 100).toFixed(1)}%)`);
  }
}

// 2. Soatlik breakdown (oxirgi 3 soat)
console.log('\n2. Oxirgi 3 soat (soat bo\'yicha):');

const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

const hourly = db.prepare(`
  SELECT
    substr(sent_at, 12, 2) as hour,
    status,
    COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ?
  GROUP BY hour, status
  ORDER BY hour DESC, status
`).all(threeHoursAgo);

// Gruppalash
const hours = {};
hourly.forEach(row => {
  const h = row.hour;
  if (!hours[h]) hours[h] = { success: 0, failed: 0, cooldown: 0, blocked: 0 };
  hours[h][row.status] = row.count;
});

Object.keys(hours).sort().reverse().forEach(hour => {
  const h = hours[hour];
  const total = h.success + h.failed + h.cooldown + h.blocked;
  const successRate = total > 0 ? ((h.success / total) * 100).toFixed(0) : 0;
  console.log(`   ${hour}:00 | Jami: ${total} | ✅${h.success} ❌${h.failed} ⏸️${h.cooldown} | Success: ${successRate}%`);
});

// 3. Qaysi guruhlar uchun SMS yuborildi?
console.log('\n3. Qaysi guruhlarga SMS yuborildi (bugun, TOP 5):');

const topGroups = db.prepare(`
  SELECT g.name, COUNT(*) as count,
         SUM(CASE WHEN s.status = 'success' THEN 1 ELSE 0 END) as success_count
  FROM sms_logs s
  LEFT JOIN groups g ON s.group_id = g.id
  WHERE DATE(s.sent_at) = ?
  GROUP BY s.group_id
  ORDER BY count DESC
  LIMIT 5
`).all(today);

topGroups.forEach(g => {
  const rate = g.count > 0 ? ((g.success_count / g.count) * 100).toFixed(0) : 0;
  console.log(`   ${g.name || 'N/A'}: ${g.count} ta (${g.success_count} success, ${rate}%)`);
});

// 4. Eng ko'p SMS yuborilgan raqamlar
console.log('\n4. Eng ko\'p SMS yuborilgan raqamlar (bugun, TOP 5):');

const topPhones = db.prepare(`
  SELECT to_phone, COUNT(*) as count,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count
  FROM sms_logs
  WHERE DATE(sent_at) = ?
  GROUP BY to_phone
  ORDER BY count DESC
  LIMIT 5
`).all(today);

topPhones.forEach(p => {
  console.log(`   ${p.to_phone}: ${p.count} ta (${p.success_count} success)`);
});

db.close();
