/**
 * QARSHI VA SHAHRISABZ → TOSHKENT YO'NALISHLARINI QO'SHISH
 */

const { createRoute } = require('./src/database/routes');
const { QASHQADARYO_KEYWORDS, TOSHKENT_KEYWORDS } = require('./qashqadaryo_keywords');

async function addQarshiAndShahrisabz() {
  console.log('📍 QARSHI VA SHAHRISABZ → TOSHKENT yo\'nalishlarini qo\'shish...\n');

  try {
    // 1. Qarshi → Toshkent
    const qarshiKeywords = QASHQADARYO_KEYWORDS.qarshi.join(',');
    await createRoute(
      'Qashqadaryo (Qarshi) → Toshkent',
      qarshiKeywords,
      TOSHKENT_KEYWORDS.join(','),
      'Assalomu alaykum! Qarshidan Toshkentga yo\'lovchi kerak.',
      120 // 2 soat
    );
    console.log('✅ Qarshi → Toshkent yo\'nalishi qo\'shildi');

    // 2. Shahrisabz → Toshkent
    const shahrisabzKeywords = QASHQADARYO_KEYWORDS.shahrisabz.join(',');
    await createRoute(
      'Qashqadaryo (Shahrisabz) → Toshkent',
      shahrisabzKeywords,
      TOSHKENT_KEYWORDS.join(','),
      'Assalomu alaykum! Shahrisabzdan Toshkentga yo\'lovchi kerak.',
      120 // 2 soat
    );
    console.log('✅ Shahrisabz → Toshkent yo\'nalishi qo\'shildi');

    // 3. Yakkabog'ni 120 daqiqaga yangilash
    const { query } = require('./src/database/sqlite');
    await query(
      'UPDATE routes SET time_window_minutes = 120, from_keywords = ? WHERE name LIKE ?',
      [QASHQADARYO_KEYWORDS.yakkabog.join(','), '%Yakkabog%']
    );
    console.log('✅ Yakkabog\' 120 daqiqaga yangilandi (2 soat)');

    console.log('\n✅ HAMMASI TAYYOR!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addQarshiAndShahrisabz();
