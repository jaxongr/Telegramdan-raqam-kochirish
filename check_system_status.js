/**
 * ТИЗИМ ҲОЛАТИНИ ТЕКШИРУВЧИ СКРИПТ
 */

const { query } = require('./src/database/sqlite');

async function checkSystemStats() {
  try {
    console.log('\n📊 ҲОЗИРГИ ТИЗИМ ҲОЛАТИ\n');
    console.log('═══════════════════════════════════════════════════\n');

    // 1. ГУРУХЛАР
    const totalGroups = await query('SELECT COUNT(*) as cnt FROM groups');
    const activeGroups = await query('SELECT COUNT(*) as cnt FROM groups WHERE active = 1');
    const total = totalGroups[0].cnt || totalGroups[0].CNT;
    const active = activeGroups[0].cnt || activeGroups[0].CNT;

    console.log('🏢 ГУРУХЛАР:');
    console.log(`  ✅ Кузатилаётган: ${active} та`);
    console.log(`  📊 Жами базада: ${total} та`);
    console.log(`  📈 Фоиз: ${Math.round(active / 50 * 100)}% (max 50 ta)\n`);

    // 2. ХАБАРЛАР (охирги 1 соат)
    const messages1h = await query("SELECT COUNT(*) as cnt FROM phones WHERE last_date >= datetime('now', '-1 hour')");
    const cnt1h = messages1h[0].cnt || messages1h[0].CNT;
    console.log('📨 ХАБАРЛАР (охирги 1 соат):');
    console.log(`  • Қайта ишланган: ${cnt1h} та`);
    console.log(`  • Тезлик: ~${Math.round(cnt1h / 60)} хабар/дақиқа\n`);

    // 3. ХАБАРЛАР (охирги 24 соат)
    const messages24h = await query("SELECT COUNT(*) as cnt FROM phones WHERE last_date >= datetime('now', '-1 day')");
    const cnt24h = messages24h[0].cnt || messages24h[0].CNT;
    console.log('📨 ХАБАРЛАР (охирги 24 соат):');
    console.log(`  • Қайта ишланган: ${cnt24h} та`);
    console.log(`  • Ўртача: ~${Math.round(cnt24h / 24)} хабар/соат\n`);

    // 4. ТЕЛЕФОН РАҚАМЛАР
    const totalPhones = await query('SELECT COUNT(*) as cnt FROM phones');
    const uniquePhones = await query('SELECT COUNT(DISTINCT phone) as cnt FROM phones');
    const totalPh = totalPhones[0].cnt || totalPhones[0].CNT;
    const uniquePh = uniquePhones[0].cnt || uniquePhones[0].CNT;
    console.log('📞 ТЕЛЕФОН РАҚАМЛАР:');
    console.log(`  • Жами саволлар: ${totalPh} та`);
    console.log(`  • Уникал рақамлар: ${uniquePh} та\n`);

    // 5. ЙЎНАЛИШЛАР
    const activeRoutes = await query('SELECT COUNT(*) as cnt FROM routes WHERE active = 1');
    const routeMessages = await query('SELECT COUNT(*) as cnt FROM route_messages');
    const actR = activeRoutes[0].cnt || activeRoutes[0].CNT;
    const msgR = routeMessages[0].cnt || routeMessages[0].CNT;
    console.log('🚦 ЙЎНАЛИШЛАР:');
    console.log(`  • Фаол йўналишлар: ${actR} та`);
    console.log(`  • Эълонлар: ${msgR} та\n`);

    // 6. ОХИРГИ ФАОЛ ГУРУХЛАР
    const activeGroupsList = await query('SELECT id, name, telegram_id FROM groups WHERE active = 1 ORDER BY id');
    console.log('✅ КУЗАТИЛАЁТГАН ГУРУХЛАР:\n');
    activeGroupsList.forEach((g, i) => {
      const name = g.name || g.NAME;
      const tgId = g.telegram_id || g.TELEGRAM_ID;
      console.log(`  ${i + 1}. ${name}`);
      console.log(`     ID: ${tgId}\n`);
    });

    // 7. ОХИРГИ 5 ТА ХАБАР
    console.log('📋 ОХИРГИ 5 ТА ХАБАР:\n');
    const recent = await query('SELECT phone, last_message, last_date FROM phones ORDER BY last_date DESC LIMIT 5');

    recent.forEach((r, i) => {
      const msg = (r.last_message || r.LAST_MESSAGE || '').substring(0, 80).replace(/\n/g, ' ');
      const phone = r.phone || r.PHONE;
      const date = r.last_date || r.LAST_DATE;
      console.log(`  ${i + 1}. 📞 ${phone}`);
      console.log(`     📅 ${date}`);
      console.log(`     💬 ${msg}...\n`);
    });

    console.log('═══════════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSystemStats();
