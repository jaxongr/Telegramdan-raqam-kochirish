const { findMatchingPhones, getAllRoutes } = require('./src/database/routes');

async function testRouteMatching() {
  try {
    console.log('\n=== YO\'NALISHLAR MATCHING TEST ===\n');

    const routes = await getAllRoutes();
    const activeRoutes = routes.filter(r => r.active);

    console.log(`Jami faol yo'nalishlar: ${activeRoutes.length}`);
    console.log('\nBirinchi 10 ta yo\'nalishni test qilish...\n');

    for (const route of activeRoutes.slice(0, 10)) {
      const matches = await findMatchingPhones(route.id, 120);

      console.log(`[${route.id}] ${route.name}:`);
      console.log(`  FROM: ${route.from_keywords}`);
      console.log(`  TO: ${route.to_keywords}`);
      console.log(`  TOPILDI: ${matches.length} ta raqam (oxirgi 2 soat)`);

      if (matches.length > 0) {
        console.log('  Birinchi 3 ta:');
        matches.slice(0, 3).forEach(m => {
          console.log(`    - ${m.phone}: ${m.last_message.substring(0, 60)}`);
        });
      }
      console.log('');
    }

    console.log('=== TEST TUGADI ===');
  } catch (error) {
    console.error('Test xatosi:', error);
  }
}

testRouteMatching();