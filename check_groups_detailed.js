const { query } = require('./src/database/sqlite');

(async () => {
  try {
    const groups = await query('SELECT * FROM groups ORDER BY id');
    console.log('\n=== GURUHLAR (Batafsil) ===');
    groups.forEach((g, idx) => {
      console.log(`\n[${idx + 1}]`);
      console.log(`  ID: ${g.id} (type: ${typeof g.id})`);
      console.log(`  Name: ${g.name}`);
      console.log(`  Chat ID: ${g.chat_id}`);
      console.log(`  Active: ${g.active} (type: ${typeof g.active})`);
      console.log(`  Active === 1? ${g.active === 1}`);
      console.log(`  Active == 1? ${g.active == 1}`);
    });

    console.log(`\n\nJami: ${groups.length} ta guruh`);
    console.log(`Active === 1: ${groups.filter(g => g.active === 1).length} ta`);
    console.log(`Active == 1: ${groups.filter(g => g.active == 1).length} ta`);
    console.log(`Active truthy: ${groups.filter(g => g.active).length} ta`);

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    process.exit(1);
  }
})();
