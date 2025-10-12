/**
 * YAKKABOG' (QASHQADARYO) → TOSHKENT YO'NALISHINI QO'SHISH
 */

const { createRoute } = require('./src/database/routes');

async function addYakkabog() {
  console.log('📍 YAKKABOG\' (Qashqadaryo) → TOSHKENT yo\'nalishini qo\'shish...\n');

  try {
    // Yakkabog' (Qashqadaryo) → Toshkent yo'nalishi
    await createRoute(
      'Qashqadaryo (Yakkabog\') → Toshkent',
      'yakkabog,yakkabog\',yakkabagh,яккабог,yakkabagh',
      'toshkent,toshkentga,тошкент',
      'Assalomu alaykum! Yakkabog\'dan Toshkentga yo\'lovchi kerak.',
      30
    );

    console.log('✅ Yakkabog\' → Toshkent yo\'nalishi qo\'shildi\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    process.exit(1);
  }
}

addYakkabog();
