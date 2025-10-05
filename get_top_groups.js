const Database = require('better-sqlite3');
const db = new Database('data/broadcast.db');

// Barcha faol guruhlarni olish
const allGroups = db.prepare(`
  SELECT telegram_id, title
  FROM broadcast_groups
  WHERE status = 'active'
  ORDER BY title ASC
`).all();

console.log(`Jami ${allGroups.length} ta faol guruh topildi\n`);

// Birinchi 30 tasini olish
const topGroups = allGroups.slice(0, 30);

console.log('=== BIRINCHI 30 TA GURUH ===\n');
topGroups.forEach((g, i) => {
  console.log(`${i+1}. ${g.title}`);
});

// Telegram ID'larni olish
const ids = topGroups.map(g => g.telegram_id);
console.log('\n=== TELEGRAM IDs (vergul bilan) ===');
console.log(ids.join(','));

db.close();
