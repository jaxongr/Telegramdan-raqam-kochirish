/**
 * QASHQADARYO → TOSHKENT YO'NALISHINI QO'SHISH
 */

const { createRoute } = require('./src/database/routes');

async function addQashqadaryo() {
  console.log('📍 QASHQADARYO → TOSHKENT yo\'nalishini qo\'shish...\n');

  try {
    // Qashqadaryo → Toshkent yo'nalishi
    await createRoute(
      'Qashqadaryo → Toshkent',
      'qashqadaryo,qashqadarya,кашкадарья,кашка',
      'toshkent,toshkentga,тошкент',
      'Assalomu alaykum! Qashqadaryodan Toshkentga yo\'lovchi kerak.',
      30
    );

    console.log('✅ Qashqadaryo → Toshkent yo\'nalishi qo\'shildi\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    process.exit(1);
  }
}

addQashqadaryo();
