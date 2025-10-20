const Database = require('better-sqlite3');

const db = new Database('./data/database_server_latest.sqlite', { readonly: true });

const now = new Date();
const cutoff = new Date(now - 120 * 60 * 1000); // 120 minutes ago

console.log('Hozirgi vaqt:', now.toISOString());
console.log('Cutoff vaqt (120 daqiqa oldin):', cutoff.toISOString());
console.log('\n=== 120 DAQIQA ICHIDAGI UNSENT MESSAGES ===\n');

const routes = db.prepare('SELECT id, name FROM routes WHERE active = 1 ORDER BY id').all();

routes.forEach(route => {
  const messages = db.prepare(`
    SELECT rm.id, rm.message_date, rm.phone_numbers, rm.sms_sent
    FROM route_messages rm
    WHERE rm.route_id = ? AND rm.sms_sent = 0 AND rm.message_date >= ?
    ORDER BY rm.message_date DESC
  `).all(route.id, cutoff.toISOString());

  if (messages.length > 0) {
    console.log(`Route ${route.id} (${route.name}):`);
    console.log(`  ${messages.length} ta kutayotgan xabar`);

    let totalPhones = 0;
    messages.forEach(m => {
      const phones = JSON.parse(m.phone_numbers || '[]');
      totalPhones += phones.length;
    });
    console.log(`  ${totalPhones} ta telefon raqam`);
    console.log('');
  }
});

const totalUnsent = db.prepare(`
  SELECT COUNT(*) as count, route_id
  FROM route_messages
  WHERE sms_sent = 0 AND message_date >= ?
  GROUP BY route_id
`).all(cutoff.toISOString());

console.log('\n📊 UMUMIY:');
totalUnsent.forEach(r => {
  console.log(`  Route ${r.route_id}: ${r.count} ta xabar`);
});

db.close();
