const { query } = require('./src/database/sqlite');

async function deleteBadRoutes() {
  try {
    console.log('🗑️  Barcha noto\'g\'ri routelarni o\'chirish...\n');

    // Avval jami routelar sonini ko'rsatish
    const before = await query('SELECT COUNT(*) as count FROM routes');
    console.log(`Hozirda: ${before[0].count} ta route bor\n`);

    // Avval bog'langan route_messages va route_sms_logs'larni o'chirish
    console.log('1️⃣ route_messages ni o\'chirish...');
    const msg_result = await query('DELETE FROM route_messages WHERE route_id < 12186 OR route_id > 12198');
    console.log(`   O'chirildi: ${msg_result.changes} ta xabar\n`);

    console.log('2️⃣ route_sms_logs ni o\'chirish...');
    const log_result = await query('DELETE FROM route_sms_logs WHERE route_id < 12186 OR route_id > 12198');
    console.log(`   O'chirildi: ${log_result.changes} ta log\n`);

    // Faqat ID 12186 dan 12198 gacha bo'lganlarni SAQLASH
    // Boshqa barcha routelarni o'chirish
    console.log('3️⃣ Routelarni o\'chirish...');
    const result = await query('DELETE FROM routes WHERE id < 12186 OR id > 12198');

    console.log(`✅ O'chirildi: ${result.changes} ta route\n`);

    // Keyingi holat
    const after = await query('SELECT COUNT(*) as count FROM routes');
    console.log(`Hozir: ${after[0].count} ta route qoldi\n`);

    // Qolgan routelarni ko'rsatish
    const remaining = await query('SELECT id, name FROM routes ORDER BY id');
    console.log('Qolgan routelar:');
    remaining.forEach(r => console.log(`  ${r.id}: ${r.name}`));

    console.log('\n✅ TAYYOR!');

  } catch (error) {
    console.error('❌ Xato:', error);
  }
  process.exit(0);
}

deleteBadRoutes();
