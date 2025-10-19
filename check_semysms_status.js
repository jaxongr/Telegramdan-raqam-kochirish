const db = require('better-sqlite3')('./data/database.sqlite');

console.log('=== SemySMS Telefonlar Holati ===\n');

const phones = db.prepare('SELECT * FROM semysms_phones').all();

console.log(`Jami: ${phones.length} ta telefon\n`);

phones.forEach(p => {
  console.log(`Phone: ${p.phone}`);
  console.log(`  Device ID: ${p.device_id}`);
  console.log(`  Status: ${p.status}`);
  console.log(`  Balance: ${p.balance}`);
  console.log(`  Last used: ${p.last_used}`);
  console.log(`  Total sent: ${p.total_sent}`);
  console.log('');
});

// Active telefonlar
const active = db.prepare('SELECT COUNT(*) as count FROM semysms_phones WHERE status = ?').get('active');
console.log(`\nActive telefonlar: ${active.count}`);

// Inactive telefonlar
const inactive = db.prepare('SELECT COUNT(*) as count FROM semysms_phones WHERE status != ?').get('active');
console.log(`Inactive telefonlar: ${inactive.count}`);

// Low balance telefonlar
const lowBalance = db.prepare('SELECT COUNT(*) as count FROM semysms_phones WHERE status = ?').get('low_balance');
console.log(`Low balance telefonlar: ${lowBalance.count}`);

console.log('\n=== TUZATISH ===');

// Barcha telefonlarni active qilish
const result = db.prepare("UPDATE semysms_phones SET status = 'active' WHERE status != 'active'").run();
console.log(`${result.changes} ta telefon active ga o'zgartirildi`);

// Tekshirish
const activeAfter = db.prepare('SELECT COUNT(*) as count FROM semysms_phones WHERE status = ?').get('active');
console.log(`\nActive telefonlar (keyin): ${activeAfter.count}`);

db.close();
