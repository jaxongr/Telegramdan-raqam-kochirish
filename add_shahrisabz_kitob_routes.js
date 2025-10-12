/**
 * SHAHRISABZ VA KITOB → TOSHKENT YO'NALISHLARINI QO'SHISH
 */

const { createRoute } = require('./src/database/routes');
const { QASHQADARYO_KEYWORDS, TOSHKENT_KEYWORDS } = require('./qashqadaryo_keywords');

async function addShahrisabzAndKitob() {
  console.log('📍 SHAHRISABZ VA KITOB → TOSHKENT yo\'nalishlarini qo\'shish...\n');

  try {
    // 1. Shahrisabz → Toshkent
    const shahrisabzKeywords = QASHQADARYO_KEYWORDS.shahrisabz.join(',');
    const shahrisabzRouteId = await createRoute(
      'Qashqadaryo (Shahrisabz) → Toshkent',
      shahrisabzKeywords,
      TOSHKENT_KEYWORDS.join(','),
      'Assalomu alaykum! Shahrisabzdan Toshkentga yo\'lovchi kerak.',
      120 // 2 soat
    );
    console.log('✅ Shahrisabz → Toshkent yo\'nalishi qo\'shildi (ID: ' + shahrisabzRouteId + ')');

    // 2. Kitob → Toshkent (alohida yo'nalish)
    // Kitob - Yakkabog' tumanidagi shahar, lekin alohida yo'nalish
    const kitobKeywords = 'kitob,kitob tuman,kitob tumani,kitob shahri,kitob shahar,китоб,kітоб,qitob,qitоб';
    const kitobRouteId = await createRoute(
      'Qashqadaryo (Kitob) → Toshkent',
      kitobKeywords,
      TOSHKENT_KEYWORDS.join(','),
      'Assalomu alaykum! Kitobdan Toshkentga yo\'lovchi kerak.',
      120 // 2 soat
    );
    console.log('✅ Kitob → Toshkent yo\'nalishi qo\'shildi (ID: ' + kitobRouteId + ')');

    console.log('\n✅ HAMMASI TAYYOR!');
    console.log('   Shahrisabz: Route ID ' + shahrisabzRouteId);
    console.log('   Kitob: Route ID ' + kitobRouteId);
    console.log('\nENDI BARCHA GURUHLARDAN:');
    console.log('   - Shahrisabzdan Toshkentga');
    console.log('   - Kitobdan Toshkentga');
    console.log('   - Yakkabog\'dan Toshkentga');
    console.log('elonlar alohida yonalishlarda topiladi!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addShahrisabzAndKitob();
