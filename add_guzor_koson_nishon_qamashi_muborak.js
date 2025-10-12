/**
 * G'UZOR, KOSON, NISHON, QAMASHI, MUBORAK → TOSHKENT YO'NALISHLARINI QO'SHISH
 * Qashqadaryo viloyatining yana 5 ta tumani
 */

const { createRoute } = require('./src/database/routes');
const { QASHQADARYO_KEYWORDS, TOSHKENT_KEYWORDS } = require('./qashqadaryo_keywords');

async function addFiveDistricts() {
  console.log('📍 5 ta tuman yo\'nalishlarini qo\'shish...\\n');

  try {
    const districts = [
      { name: 'G\'uzor', key: 'guzor', displayName: 'G\'uzordan' },
      { name: 'Koson', key: 'koson', displayName: 'Kosondan' },
      { name: 'Nishon', key: 'nishon', displayName: 'Nishondan' },
      { name: 'Qamashi', key: 'qamashi', displayName: 'Qamashidan' },
      { name: 'Muborak', key: 'muborak', displayName: 'Muborakdan' }
    ];

    for (const district of districts) {
      const keywords = QASHQADARYO_KEYWORDS[district.key].join(',');
      const routeId = await createRoute(
        `Qashqadaryo (${district.name}) → Toshkent`,
        keywords,
        TOSHKENT_KEYWORDS.join(','),
        `Assalomu alaykum! ${district.displayName} Toshkentga yo'lovchi kerak.`,
        120 // 2 soat
      );
      console.log(`✅ ${district.name} → Toshkent yo'nalishi qo'shildi (ID: ${routeId})`);
    }

    console.log('\\n✅ HAMMASI TAYYOR!');
    console.log('   5 ta yangi yo\'nalish qo\'shildi:');
    console.log('   - G\'uzor → Toshkent');
    console.log('   - Koson → Toshkent');
    console.log('   - Nishon → Toshkent');
    console.log('   - Qamashi → Toshkent');
    console.log('   - Muborak → Toshkent');
    console.log('\\nMonitoring avtomatik ishga tushdi!\\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addFiveDistricts();
