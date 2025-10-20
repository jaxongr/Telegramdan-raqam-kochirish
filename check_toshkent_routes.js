const { query } = require('./src/database/sqlite');

(async () => {
  const routes = await query('SELECT name FROM routes WHERE name LIKE ? ORDER BY name', ['Toshkent →%']);

  console.log('\n📊 TOSHKENTDAN KETUVCHI YO\'NALISHLAR:\n');
  routes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
  });

  console.log(`\nJami: ${routes.length} ta\n`);

  process.exit(0);
})();
