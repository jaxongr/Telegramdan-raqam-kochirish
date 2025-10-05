const fs = require('fs');
const db = JSON.parse(fs.readFileSync('data/database.json', 'utf8'));
const active = db.groups.filter(g => g.active === 1);

console.log(`\n=== ACTIVE ${active.length} TA GURUH ===\n`);
active.forEach((g, i) => {
  console.log(`${i+1}. ${g.name}`);
});
