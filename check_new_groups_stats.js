/**
 * ЯНГИ ҚЎШИЛГАН ГУРУХЛАРДАН КЕЛГАН ЭЪЛОНЛАРНИ ТЕКШИРУВЧИ
 */

const { query } = require('./src/database/sqlite');

async function checkNewGroupsStats() {
  try {
    console.log('\n📊 ЯНГИ ГУРУХЛАРДАН КЕЛГАН ЭЪЛОНЛАР\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Барча гурухлар ва уларнинг эълонлари
    const groupsWithMessages = await query(`
      SELECT
        g.id,
        g.name,
        g.telegram_id,
        COUNT(DISTINCT p.phone) as phone_count,
        COUNT(p.id) as message_count,
        MIN(p.last_date) as first_message,
        MAX(p.last_date) as last_message
      FROM groups g
      LEFT JOIN phones p ON p.group_id = g.id
      WHERE g.active = 1
      GROUP BY g.id
      ORDER BY phone_count DESC
    `);

    console.log('🏆 ГУРУХЛАР БЎЙИЧА СТАТИСТИКА:\n');

    let totalMessages = 0;
    let totalPhones = 0;
    let activeGroupsCount = 0;

    groupsWithMessages.forEach((g, index) => {
      const name = g.name || g.NAME;
      const phoneCount = g.phone_count || g.PHONE_COUNT || 0;
      const messageCount = g.message_count || g.MESSAGE_COUNT || 0;
      const firstMsg = g.first_message || g.FIRST_MESSAGE;
      const lastMsg = g.last_message || g.LAST_MESSAGE;

      if (phoneCount > 0) {
        activeGroupsCount++;
        totalMessages += messageCount;
        totalPhones += phoneCount;

        console.log(`${index + 1}. ${name}`);
        console.log(`   📞 ${phoneCount} та рақам | 📨 ${messageCount} та хабар`);

        if (firstMsg) {
          const firstDate = new Date(firstMsg);
          const lastDate = new Date(lastMsg);
          const hoursDiff = Math.round((lastDate - firstDate) / (1000 * 60 * 60));
          console.log(`   ⏱️  Биринчи: ${firstMsg} | Охирги: ${lastMsg}`);
          console.log(`   📊 Фаоллик: ${hoursDiff} соат ичида`);
        }
        console.log('');
      }
    });

    console.log('═══════════════════════════════════════════════════\n');
    console.log('📈 ЖАМИ НАТИЖА:\n');
    console.log(`  ✅ Фаол гурухлар: ${activeGroupsCount} та (хабар келган)`);
    console.log(`  💤 Фаол эмас: ${groupsWithMessages.length - activeGroupsCount} та (хабар келмаган)`);
    console.log(`  📞 Жами уникал рақамлар: ${totalPhones} та`);
    console.log(`  📨 Жами хабарлар: ${totalMessages} та`);
    console.log(`  📊 Ўртача: ${Math.round(totalMessages / activeGroupsCount)} хабар/гурух\n`);

    // Йўналишлар бўйича эълонлар
    console.log('═══════════════════════════════════════════════════\n');
    console.log('🚦 ЙЎНАЛИШЛАР БЎЙИЧА ЭЪЛОНЛАР:\n');

    const routeStats = await query(`
      SELECT
        r.id,
        r.name,
        COUNT(rm.id) as message_count,
        MIN(rm.created_at) as first_message,
        MAX(rm.created_at) as last_message
      FROM routes r
      LEFT JOIN route_messages rm ON rm.route_id = r.id
      WHERE r.active = 1 AND r.name LIKE '%Qashqadaryo%'
      GROUP BY r.id
      ORDER BY message_count DESC
    `);

    let totalRouteMessages = 0;
    routeStats.forEach((r, i) => {
      const name = r.name || r.NAME;
      const count = r.message_count || r.MESSAGE_COUNT || 0;
      const first = r.first_message || r.FIRST_MESSAGE;
      const last = r.last_message || r.LAST_MESSAGE;

      if (count > 0) {
        totalRouteMessages += count;
        console.log(`${i + 1}. ${name}`);
        console.log(`   📋 ${count} та эълон`);
        if (first) {
          console.log(`   ⏱️  ${first} - ${last}`);
        }
        console.log('');
      }
    });

    console.log(`📊 Жами: ${totalRouteMessages} та эълон йўналишларга мос келди\n`);
    console.log('═══════════════════════════════════════════════════\n');

    // Охирги 10 та эълон
    console.log('📋 ОХИРГИ 10 ТА ЭЪЛОН (йўналишларга мос):\n');
    const recentRouteMessages = await query(`
      SELECT
        r.name as route_name,
        g.name as group_name,
        rm.message_text,
        rm.phone_numbers,
        rm.message_date
      FROM route_messages rm
      JOIN routes r ON r.id = rm.route_id
      JOIN groups g ON g.id = rm.group_id
      ORDER BY rm.created_at DESC
      LIMIT 10
    `);

    recentRouteMessages.forEach((m, i) => {
      const routeName = m.route_name || m.ROUTE_NAME;
      const groupName = m.group_name || m.GROUP_NAME;
      const text = (m.message_text || m.MESSAGE_TEXT || '').substring(0, 80).replace(/\n/g, ' ');
      const phones = m.phone_numbers || m.PHONE_NUMBERS || '';
      const date = m.message_date || m.MESSAGE_DATE;

      console.log(`${i + 1}. 🚦 ${routeName}`);
      console.log(`   📱 Гурух: ${groupName}`);
      console.log(`   📞 Рақамлар: ${phones}`);
      console.log(`   📅 ${date}`);
      console.log(`   💬 ${text}...\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkNewGroupsStats();
