const { query } = require('./src/database/sqlite');

(async () => {
  const routes = await query('SELECT id, name, from_keywords, to_keywords FROM routes WHERE active = 1 ORDER BY name');

  console.log('\n📋 BARCHA FAOL YO\'NALISHLAR:\n');

  routes.forEach((r, i) => {
    console.log(`${i+1}. ${r.name}`);
    console.log(`   FROM: ${r.from_keywords.substring(0, 80)}...`);
    console.log(`   TO: ${r.to_keywords.substring(0, 80)}...\n`);
  });

  console.log(`\nJami: ${routes.length} ta faol yo'nalish\n`);

  process.exit(0);
})();
