/**
 * BARCHA YO'NALISHLARNI O'CHIRISH
 * DIQQAT: Bu script database'dagi barcha routes va route_messages'larni o'chiradi!
 */

const { query } = require('./src/database/sqlite');

async function deleteAllRoutes() {
  console.log('🗑️  BARCHA YO\'NALISHLARNI O\'CHIRISH...\n');

  try {
    // 1. Barcha yo'nalishlar sonini olish
    const routes = await query('SELECT COUNT(*) as count FROM routes');
    const routeCount = routes[0].count || routes[0].COUNT || 0;
    console.log(`📊 Jami yo'nalishlar: ${routeCount} ta\n`);

    if (routeCount === 0) {
      console.log('✅ Database allaqachon bo\'sh!\n');
      process.exit(0);
    }

    // 2. Route messages o'chirish (agar mavjud bo'lsa)
    try {
      console.log('🗑️  Route messages o\'chirilmoqda...');
      await query('DELETE FROM route_messages');
      console.log('✅ Route messages o\'chirildi\n');
    } catch (e) {
      console.log('⏭  Route messages jadvali yo\'q, o\'tkazib yuborildi\n');
    }

    // 3. Route SMS logs o'chirish
    try {
      console.log('🗑️  Route SMS logs o\'chirilmoqda...');
      await query('DELETE FROM route_sms_logs');
      console.log('✅ Route SMS logs o\'chirildi\n');
    } catch (e) {
      console.log('⏭  Route SMS logs jadvali yo\'q, o\'tkazib yuborildi\n');
    }

    // 4. Barcha yo'nalishlarni o'chirish
    console.log('🗑️  Barcha yo\'nalishlar o\'chirilmoqda...');
    const deleteRoutes = await query('DELETE FROM routes');
    console.log('✅ Barcha yo\'nalishlar o\'chirildi\n');

    // 5. Natija
    const finalCheck = await query('SELECT COUNT(*) as count FROM routes');
    const finalCount = finalCheck[0].count || finalCheck[0].COUNT || 0;

    console.log('\n📊 NATIJA:');
    console.log(`   O'chirildi: ${routeCount} ta yo'nalish`);
    console.log(`   Qoldi: ${finalCount} ta yo'nalish`);
    console.log('\n✅ DATABASE TOZALANDI! Yangi yo\'nalishlar qo\'shishga tayyor!\n');

  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

deleteAllRoutes();
