const Database = require('better-sqlite3');
const fs = require('fs');

// Broadcast database'dan guruhlarni olish
const broadcastDb = new Database('data/broadcast.db');
const broadcastGroups = broadcastDb.prepare('SELECT telegram_id, title FROM broadcast_groups WHERE status = ?').all('active');
broadcastDb.close();

console.log('=== Broadcast guruhlar: ' + broadcastGroups.length + ' ta ===\n');

// Main database'ni o'qish
const mainDb = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));

// Logistics kalit so'zlari
const keywords = 'toshkent,samarqand,buxoro,xiva,qarshi,termiz,andijon,fargona,namangan,nukus,jizzax,navoiy,guliston,ketamiz,boraman,kerak,yuk,pochta,odam,moshina,avto,cobalt,nexia,matiz,damas,lacetti,gentra,spark';

let addedCount = 0;

// Har bir broadcast guruhni main database'ga qo'shish
broadcastGroups.forEach(bg => {
  // Agar allaqachon bor bo'lsa, skip
  const exists = mainDb.groups.find(g => g.telegram_id === bg.telegram_id);

  if (!exists) {
    const newGroup = {
      id: mainDb.groups.length > 0 ? Math.max(...mainDb.groups.map(g => g.id)) + 1 : 1,
      name: bg.title || 'Unknown',
      telegram_id: bg.telegram_id,
      keywords: keywords,
      sms_template: '',
      active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sms_enabled: 0
    };

    mainDb.groups.push(newGroup);
    addedCount++;
    console.log('Added: ' + newGroup.name + ' (' + newGroup.telegram_id + ')');
  }
});

// Saqlash
fs.writeFileSync('data/database.json', JSON.stringify(mainDb, null, 2));

console.log('\n=== Natija ===');
console.log('Broadcast guruhlar: ' + broadcastGroups.length);
console.log('Yangi qo\'shildi: ' + addedCount);
console.log('Jami guruhlar: ' + mainDb.groups.length);
