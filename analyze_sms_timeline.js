const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

console.log('=== SMS Timeline Tahlili ===\n');

const today = new Date().toISOString().split('T')[0];

// 1. Soat bo'yicha xatolar
console.log('1. Soatlik xatolar taqsimoti (bugun):');

const hourly = db.prepare(`
  SELECT
    substr(sent_at, 12, 2) as hour,
    status,
    COUNT(*) as count
  FROM sms_logs
  WHERE DATE(sent_at) = ?
  GROUP BY hour, status
  ORDER BY hour DESC
`).all(today);

// Soatlar bo'yicha guruhlab ko'rsatish
const hours = {};
hourly.forEach(row => {
  const h = row.hour;
  if (!hours[h]) hours[h] = { success: 0, failed: 0, cooldown: 0 };
  hours[h][row.status] = row.count;
});

Object.keys(hours).sort().reverse().forEach(hour => {
  const h = hours[hour];
  const total = h.success + h.failed + h.cooldown;
  console.log(`  ${hour}:00 - Jami: ${total} | Success: ${h.success}, Failed: ${h.failed}, Cooldown: ${h.cooldown}`);
});

// 2. Birinchi va oxirgi xatolar
console.log('\n2. Birinchi va oxirgi xatolar:');

const first = db.prepare(`
  SELECT sent_at, status, error
  FROM sms_logs
  WHERE DATE(sent_at) = ? AND status = 'failed'
  ORDER BY sent_at ASC
  LIMIT 1
`).get(today);

const last = db.prepare(`
  SELECT sent_at, status, error
  FROM sms_logs
  WHERE DATE(sent_at) = ? AND status = 'failed'
  ORDER BY sent_at DESC
  LIMIT 1
`).get(today);

if (first) {
  console.log(`  Birinchi failed: ${first.sent_at} | ${first.error || 'No msg'}`);
}

if (last) {
  console.log(`  Oxirgi failed: ${last.sent_at} | ${last.error || 'No msg'}`);
}

// 3. "All phones unavailable" xatolari vaqt oralig'i
console.log('\n3. "All phones unavailable" xatolari:');

const allPhonesErrors = db.prepare(`
  SELECT MIN(sent_at) as first, MAX(sent_at) as last, COUNT(*) as count
  FROM sms_logs
  WHERE error = 'All phones unavailable'
`).get();

if (allPhonesErrors && allPhonesErrors.count > 0) {
  console.log(`  Jami: ${allPhonesErrors.count}`);
  console.log(`  Birinchi: ${allPhonesErrors.first}`);
  console.log(`  Oxirgi: ${allPhonesErrors.last}`);

  // Bu oraliqda SemySMS telefonlar nima holatda edi?
  const firstTime = allPhonesErrors.first;
  const lastTime = allPhonesErrors.last;

  console.log(`\n  Davomiylik: ${firstTime} dan ${lastTime} gacha`);

  // Bu oraliqda qancha success bo'lgan?
  const successDuring = db.prepare(`
    SELECT COUNT(*) as count
    FROM sms_logs
    WHERE sent_at >= ? AND sent_at <= ? AND status = 'success'
  `).get(firstTime, lastTime);

  console.log(`  Shu vaqt oralig'ida success SMS: ${successDuring.count}`);
}

db.close();
