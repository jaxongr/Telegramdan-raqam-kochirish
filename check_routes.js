const { getAllRoutes } = require('/root/telegram-sms/src/database/routes');

(async () => {
  const routes = await getAllRoutes();

  console.log('=== Barcha yonalishlar ===\n');

  const activeRoutes = routes.filter(r => r.active);
  console.log('Active yonalishlar: ' + activeRoutes.length + ' ta');
  console.log('Inactive yonalishlar: ' + (routes.length - activeRoutes.length) + ' ta');
  console.log('');

  routes.forEach((r, i) => {
    console.log((i+1) + '. ID=' + r.id + ' | ' + r.name);
    console.log('   Active: ' + (r.active ? 'HA' : 'YOQ'));
    console.log('   Time window: ' + r.time_window_minutes + ' daqiqa');
    console.log('   Use region: ' + (r.use_region_matching ? 'HA' : 'YOQ'));
    console.log('');
  });

  process.exit(0);
})();
