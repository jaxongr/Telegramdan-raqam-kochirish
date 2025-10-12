/**
 * BARCHA YO'NALISHLAR BO'YICHA E'LONLAR SONINI TEKSHIRISH
 */

const { query } = require('./src/database/sqlite');

async function checkAllRouteCounts() {
  try {
    console.log('\n📊 BARCHA YONALISHLAR BOYICHA ELONLAR:\n');

    const routes = await query("SELECT id, name, active FROM routes WHERE name LIKE '%Qashqadaryo%' ORDER BY id");

    for (const route of routes) {
      const routeId = route.id || route.ID;
      const routeName = route.name || route.NAME;
      const isActive = route.active || route.ACTIVE;

      const count = await query('SELECT COUNT(*) as cnt FROM route_messages WHERE route_id = ?', [routeId]);
      const recent = await query('SELECT MAX(created_at) as last FROM route_messages WHERE route_id = ?', [routeId]);

      const total = count[0].cnt || count[0].CNT || 0;
      const lastTime = recent[0].last || recent[0].LAST || 'Hech qachon';
      const status = isActive ? '✅ ACTIVE' : '❌ Inactive';

      console.log(`${status} - ID ${routeId}: ${routeName}`);
      console.log(`   E'lonlar: ${total} ta`);
      console.log(`   Oxirgi: ${lastTime}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    process.exit(1);
  }
}

checkAllRouteCounts();
