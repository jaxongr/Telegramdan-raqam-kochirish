const Database = require('better-sqlite3');
const fs = require('fs');

// Broadcast database'dan guruh IDlarni olish
const broadcastDb = new Database('data/broadcast.db');
const broadcastGroups = broadcastDb.prepare('SELECT telegram_id FROM broadcast_groups WHERE status = ?').all('active');
const broadcastIds = broadcastGroups.map(g => g.telegram_id);
broadcastDb.close();

console.log(`📊 Broadcast guruhlar: ${broadcastIds.length} ta\n`);

// Main database'ni o'qish
const mainDb = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

const before = mainDb.groups.length;

// Broadcast guruhlarni o'chirish
mainDb.groups = mainDb.groups.filter(g => !broadcastIds.includes(g.telegram_id));

const after = mainDb.groups.length;
const removed = before - after;

// Saqlash
fs.writeFileSync('data/database.json', JSON.stringify(mainDb, null, 2));

console.log('=== NATIJA ===');
console.log(`❌ O'chirildi: ${removed} guruh`);
console.log(`✅ Qoldi: ${after} guruh`);
console.log(`\n✅ Database eski holatga qaytdi!`);
