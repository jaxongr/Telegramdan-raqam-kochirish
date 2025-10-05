const { db } = require('./src/database/sqlite');

console.log('📊 Database Statistika:\n');

// Jami guruhlar
const totalGroups = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups').get();
console.log(`Jami guruhlar: ${totalGroups.count}`);

// Unikal telegram_id lar
const uniqueIds = db.prepare('SELECT COUNT(DISTINCT telegram_id) as count FROM broadcast_groups').get();
console.log(`Unikal telegram_id: ${uniqueIds.count}`);

// Duplikatlar
const duplicates = totalGroups.count - uniqueIds.count;
console.log(`Duplikatlar: ${duplicates}`);

// telegram_id bo'yicha guruhlangan
const grouped = db.prepare(`
  SELECT telegram_id, COUNT(*) as count
  FROM broadcast_groups
  GROUP BY telegram_id
  HAVING count > 1
  ORDER BY count DESC
  LIMIT 10
`).all();

if (grouped.length > 0) {
  console.log(`\n🔴 Eng ko'p dublikatlar (birinchi 10):`);
  grouped.forEach(g => {
    const group = db.prepare('SELECT title FROM broadcast_groups WHERE telegram_id = ? LIMIT 1').get(g.telegram_id);
    console.log(`  - ${group.title}: ${g.count} marta`);
  });
} else {
  console.log('\n✅ Duplikatlar yo\'q - barcha guruhlar unikal!');
}

// Tayinlangan/tayinlanmagan
const assigned = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups WHERE assigned_account_id IS NOT NULL').get();
const unassigned = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups WHERE assigned_account_id IS NULL').get();

console.log(`\n📌 Tayinlangan guruhlar: ${assigned.count}`);
console.log(`❌ Tayinlanmagan guruhlar: ${unassigned.count}`);

process.exit(0);
