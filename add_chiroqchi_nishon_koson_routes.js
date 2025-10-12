/**
 * CHIROQCHI, NISHON, KOSON ТУМАНЛАРИ УЧУН ЙЎНАЛИШЛАР
 * Икки томонлама: Туман ↔ Тошкент
 */

const { createRoute } = require('./src/database/routes');
const { QASHQADARYO_KEYWORDS, TOSHKENT_KEYWORDS } = require('./qashqadaryo_keywords');

async function addNewDistrictRoutes() {
  console.log('\n🚀 ЯНГИ 3 ТА ТУМАНДАН ЙЎНАЛИШЛАР ҚЎШИЛМОҚда...\n');

  try {
    const districts = [
      {
        name: 'Chiroqchi',
        key: 'chiroqchi',
        toName: 'Chiroqchiga',
        expectedMessages: 173
      },
      {
        name: 'Nishon',
        key: 'nishon',
        toName: 'Nishonga',
        expectedMessages: 50
      },
      {
        name: 'Koson',
        key: 'koson',
        toName: 'Kosonga',
        expectedMessages: 30
      }
    ];

    console.log('═══════════════════════════════════════════════════\n');

    for (const district of districts) {
      console.log(`📍 ${district.name.toUpperCase()} учун йўналишлар яратилмоқда...\n`);

      const keywords = QASHQADARYO_KEYWORDS[district.key].join(',');

      // 1. ТУМАН → ТОШКЕНТ
      const route1Id = await createRoute(
        `Qashqadaryo (${district.name}) → Toshkent`,
        keywords,
        TOSHKENT_KEYWORDS.join(','),
        `Assalomu alaykum! ${district.name}dan Toshkentga yo'lovchi kerak.`,
        120 // 2 soat
      );
      console.log(`  ✅ ${district.name} → Toshkent (ID: ${route1Id})`);

      // 2. ТОШКЕНТ → ТУМАН
      const route2Id = await createRoute(
        `Toshkent → Qashqadaryo (${district.name})`,
        TOSHKENT_KEYWORDS.join(','),
        keywords,
        `Assalomu alaykum! Toshkentdan ${district.toName} yo'lovchi kerak.`,
        120 // 2 soat
      );
      console.log(`  ✅ Toshkent → ${district.name} (ID: ${route2Id})`);

      console.log(`  📊 Кутилаётган эълонлар: ~${district.expectedMessages} та\n`);
    }

    console.log('═══════════════════════════════════════════════════\n');
    console.log('✅ ҲАММАСИ ТАЙЁР!\n');
    console.log('📋 Жами 6 та йўналиш яратилди:\n');
    console.log('   1. Chiroqchi → Toshkent');
    console.log('   2. Toshkent → Chiroqchi');
    console.log('   3. Nishon → Toshkent');
    console.log('   4. Toshkent → Nishon (янгиси)');
    console.log('   5. Koson → Toshkent');
    console.log('   6. Toshkent → Koson\n');

    console.log('📊 Кутилаётган натижа:');
    console.log('   • Chiroqchi: ~173 та эълон');
    console.log('   • Nishon: ~50 та эълон');
    console.log('   • Koson: ~30 та эълон');
    console.log('   • Жами: ~253 та янги эълон!\n');

    console.log('⏰ 5-10 дақиқадан кейин текширинг:\n');
    console.log('   node check_all_route_counts.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addNewDistrictRoutes();
