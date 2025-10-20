const Database = require('better-sqlite3');

const db = new Database('./data/database_server_check.sqlite', { readonly: true });

console.log('=== ROUTE MESSAGES (Kutayotgan e\'lonlar) ===\n');

const messages = db.prepare(`
  SELECT id, route_id, message_date, phone_numbers, sms_sent, created_at
  FROM route_messages
  ORDER BY created_at DESC
  LIMIT 10
`).all();

messages.forEach(m => {
  const phones = JSON.parse(m.phone_numbers || '[]');
  console.log(`ID ${m.id}:`);
  console.log(`  Route: ${m.route_id}`);
  console.log(`  Date: ${m.message_date}`);
  console.log(`  Phones: ${phones.length} ta - ${phones.slice(0, 3).join(', ')}${phones.length > 3 ? '...' : ''}`);
  console.log(`  SMS yuborildi: ${m.sms_sent ? 'Ha' : 'Yo\'q'}`);
  console.log('');
});

console.log('\n=== SMS YUBORILMAGAN E\'LONLAR ===\n');

const unsent = db.prepare(`
  SELECT route_id, COUNT(*) as count, SUM(LENGTH(phone_numbers) - LENGTH(REPLACE(phone_numbers, ',', '')) + 1) as phone_count
  FROM route_messages
  WHERE sms_sent = 0
  GROUP BY route_id
`).all();

unsent.forEach(r => {
  console.log(`Route ${r.route_id}: ${r.count} ta elon, ${r.phone_count} ta raqam`);
});

db.close();
