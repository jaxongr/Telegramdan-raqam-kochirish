/**
 * QASHQADARYO YO'NALISHLARINI TEKSHIRISH
 */

const { getAllRoutes } = require('./src/database/routes');

async function checkQashqadaryoRoutes() {
  try {
    const routes = await getAllRoutes();
    const qashqadaryoRoutes = routes.filter(r => r.name.toLowerCase().includes('qashqadaryo'));

    console.log('\n📍 QASHQADARYO YO\'NALISHLARI:\n');
    qashqadaryoRoutes.forEach(r => {
      const status = r.active ? '✅ ACTIVE' : '❌ Inactive';
      console.log(`  ${status} - ${r.name} (ID: ${r.id})`);
    });
    console.log(`\n  Jami: ${qashqadaryoRoutes.length} ta yo'nalish\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    process.exit(1);
  }
}

checkQashqadaryoRoutes();
