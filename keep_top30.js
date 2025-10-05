const fs = require('fs');

// Main database'ni o'qish
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

// TOP 30 Telegram IDs
const top30Ids = [
  '1372932763','1285741681','1442261161','1440436000','1138127394',
  '2518757867','1072169114','1293476197','1328104399','1158403262',
  '1332772409','2766859567','1470062403','1368497933','1721634170',
  '1776518293','1893172317','1351394674','2090689463','1422898375',
  '1986972121','1296460013','1007035283','1330538878','1450848210',
  '1374345083','1231052434','1652848918','1769852300','1417198038'
];

let activeCount = 0;
let inactiveCount = 0;

// Barcha guruhlarni ko'rib chiqish
db.groups.forEach(group => {
  if (top30Ids.includes(group.telegram_id)) {
    group.active = 1;
    activeCount++;
  } else {
    group.active = 0;
    inactiveCount++;
  }
});

// Saqlash
fs.writeFileSync('data/database.json', JSON.stringify(db, null, 2));

console.log('\n=== NATIJA ===');
console.log(`✅ Active: ${activeCount} guruh`);
console.log(`❌ Inactive: ${inactiveCount} guruh`);
console.log(`📊 Jami: ${db.groups.length} guruh`);
console.log('\n✅ Database yangilandi!');
