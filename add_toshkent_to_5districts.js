/**
 * TOSHKENTDAN → 5 TA TUMAN YO'NALISHLARINI QO'SHISH
 * Teskari yo'nalish (Toshkent → G'uzor, Koson, Nishon, Qamashi, Muborak)
 */

const { createRoute } = require('./src/database/routes');
const { QASHQADARYO_KEYWORDS, TOSHKENT_KEYWORDS } = require('./qashqadaryo_keywords');

async function addToshkentToDistricts() {
  console.log('📍 TOSHKENTDAN 5 TA TUMANGA YO\'NALISHLARNI QO\'SHISH...\\n');

  try {
    const districts = [
      { name: 'G\'uzor', key: 'guzor', displayName: 'G\'uzorga' },
      { name: 'Koson', key: 'koson', displayName: 'Kosonga' },
      { name: 'Nishon', key: 'nishon', displayName: 'Nishonga' },
      { name: 'Qamashi', key: 'qamashi', displayName: 'Qamashiga' },
      { name: 'Muborak', key: 'muborak', displayName: 'Muborakka' }
    ];

    for (const district of districts) {
      const keywords = QASHQADARYO_KEYWORDS[district.key].join(',');
      const routeId = await createRoute(
        `Toshkent → Qashqadaryo (${district.name})`,
        TOSHKENT_KEYWORDS.join(','),
        keywords,
        `Assalomu alaykum! Toshkentdan ${district.displayName} yo'lovchi kerak.`,
        120 // 2 soat
      );
      console.log(`✅ Toshkent → ${district.name} yo'nalishi qo'shildi (ID: ${routeId})`);
    }

    console.log('\\n✅ HAMMASI TAYYOR!');
    console.log('   5 ta teskari yo\'nalish qo\'shildi:');
    console.log('   - Toshkent → G\'uzor');
    console.log('   - Toshkent → Koson');
    console.log('   - Toshkent → Nishon');
    console.log('   - Toshkent → Qamashi');
    console.log('   - Toshkent → Muborak');
    console.log('\\nEndi ikkala yo\'nalish ham ishlaydi!\\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addToshkentToDistricts();
