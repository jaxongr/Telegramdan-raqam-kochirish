/**
 * ЭСКИ ХАБАРЛАРНИ ЯНГИ ЙЎНАЛИШЛАРГА МОС ҚИЛИШ
 * Chiroqchi, Nishon, Koson учун эски хабарларни қайта текшириш
 */

const { query } = require('./src/database/sqlite');
const { getActiveRoutes, matchesRoute, saveRouteMessage } = require('./src/database/routes');

async function rescanOldMessages() {
  try {
    console.log('\n🔄 ЭСКИ ХАБАРЛАРНИ ҚАЙТА ТЕКШИРИШ...\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Янги йўналишларни олиш (Chiroqchi, Nishon, Koson)
    const routes = await getActiveRoutes();
    const newRoutes = routes.filter(r => {
      const name = (r.name || '').toLowerCase();
      return name.includes('chiroqchi') || name.includes('nishon') || name.includes('koson');
    });

    console.log(`✅ ${newRoutes.length} та янги йўналиш топилди:\n`);
    newRoutes.forEach(r => console.log(`   - ${r.name} (ID: ${r.id})`));
    console.log('\n');

    // Охирги 7 кун ичидаги барча хабарларни олиш
    console.log('📨 Охирги 7 кун ичидаги хабарлар олинмоқда...\n');
    const messages = await query(`
      SELECT
        p.id,
        p.phone,
        p.group_id,
        p.last_message,
        p.last_date
      FROM phones p
      WHERE p.last_date >= datetime('now', '-7 days')
      ORDER BY p.last_date DESC
    `);

    console.log(`📊 ${messages.length} та хабар топилди\n`);
    console.log('═══════════════════════════════════════════════════\n');

    let totalMatched = 0;
    const routeStats = {};

    // Har bir yangi yo'nalish uchun
    for (const route of newRoutes) {
      console.log(`🔍 ${route.name} учун текшириш...\n`);

      const fromKeywords = route.from_keywords.toLowerCase().split(',').map(k => k.trim());
      const toKeywords = route.to_keywords.toLowerCase().split(',').map(k => k.trim());

      let matchedCount = 0;

      // Har bir xabarni tekshirish
      for (const msg of messages) {
        const text = (msg.last_message || msg.LAST_MESSAGE || '').toLowerCase();
        const phone = msg.phone || msg.PHONE;
        const groupId = msg.group_id || msg.GROUP_ID;
        const date = msg.last_date || msg.LAST_DATE;

        if (matchesRoute(text, fromKeywords, toKeywords)) {
          // Agar bu xabar allaqachon shu yo'nalishda bo'lmasa
          const existing = await query(
            'SELECT id FROM route_messages WHERE route_id = ? AND message_text = ? AND message_date = ?',
            [route.id, msg.last_message || msg.LAST_MESSAGE, date]
          );

          if (existing.length === 0) {
            // Telefon raqamlarni JSON array formatiga keltirish
            const phones = [phone];

            await saveRouteMessage(
              route.id,
              groupId,
              msg.last_message || msg.LAST_MESSAGE,
              phones,
              date
            );

            matchedCount++;
            totalMatched++;
          }
        }
      }

      routeStats[route.name] = matchedCount;
      console.log(`  ✅ ${matchedCount} та эълон қўшилди\n`);
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('📊 ЖАМИ НАТИЖА:\n');

    for (const [routeName, count] of Object.entries(routeStats)) {
      console.log(`  • ${routeName}: ${count} та эълон`);
    }

    console.log(`\n  🎉 Жами: ${totalMatched} та янги эълон қўшилди!\n`);
    console.log('═══════════════════════════════════════════════════\n');

    // Tekshirish uchun statistika
    console.log('✅ Энди йўналишларни текширинг:\n');
    console.log('   node check_all_route_counts.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

rescanOldMessages();
