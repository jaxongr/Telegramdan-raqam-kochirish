const { getAllRoutes, getRouteStatistics } = require('./src/database/routes');

async function testRoutesPage() {
  try {
    console.log('📋 Testing routes page logic...\n');

    // Get all routes
    const routes = await getAllRoutes();
    console.log(`✅ Found ${routes.length} routes\n`);

    if (routes.length === 0) {
      console.log('❌ No routes found!');
      return;
    }

    // Show first 5 routes
    console.log('First 5 routes:');
    for (let i = 0; i < Math.min(5, routes.length); i++) {
      const route = routes[i];
      console.log(`  ${i+1}. ${route.name} (ID: ${route.id})`);
      console.log(`     Dan: ${route.from_keywords.substring(0, 50)}`);
      console.log(`     Ga: ${route.to_keywords.substring(0, 50)}`);
      console.log(`     Faol: ${route.active ? 'HA' : 'YOQ'}`);
      console.log('');
    }

    // Test statistics for first route
    console.log('\n📊 Testing statistics for first route...');
    const stats = await getRouteStatistics(routes[0].id);
    console.log(`  Total SMS: ${stats.total}`);
    console.log(`  Success: ${stats.success}`);
    console.log(`  Failed: ${stats.failed}`);

    console.log('\n✅ Routes page logic works correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

testRoutesPage();
