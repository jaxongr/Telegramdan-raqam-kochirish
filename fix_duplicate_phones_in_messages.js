/**
 * ROUTE_MESSAGES ICHIDAGI DUBLIKAT TELEFON RAQAMLARNI TOZALASH
 * phone_numbers JSON ichida dublikat raqamlar bo'lsa, ularni unikal qilish
 */

const { query } = require('./src/database/sqlite');

async function fixDuplicatePhonesInMessages() {
  console.log('🔧 ROUTE_MESSAGES ICHIDAGI DUBLIKAT RAQAMLARNI TOZALASH...\n');

  try {
    // Barcha xabarlarni olish
    const messages = await query('SELECT id, phone_numbers FROM route_messages');

    console.log(`📊 Jami xabarlar: ${messages.length} ta\n`);

    let fixedCount = 0;

    for (const message of messages) {
      try {
        const phones = JSON.parse(message.phone_numbers || '[]');

        // Dublikatlarni tekshirish
        const uniquePhones = [...new Set(phones)];

        if (phones.length !== uniquePhones.length) {
          console.log(`   📞 Message ID ${message.id || message.ID}:`);
          console.log(`      Oldin: ${phones.length} ta raqam`);
          console.log(`      Keyin: ${uniquePhones.length} ta raqam (${phones.length - uniquePhones.length} ta dublikat o'chirildi)`);

          // Yangilash
          await query(
            'UPDATE route_messages SET phone_numbers = ? WHERE id = ?',
            [JSON.stringify(uniquePhones), message.id || message.ID]
          );

          fixedCount++;
        }
      } catch (parseError) {
        console.error(`      ❌ Message ID ${message.id || message.ID}: JSON parse xatosi`);
      }
    }

    console.log(`\n✅ TOZALASH TUGADI!`);
    console.log(`   Tuzatilgan xabarlar: ${fixedCount} ta`);
    console.log(`   Dublikat bo'lmagan: ${messages.length - fixedCount} ta\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicatePhonesInMessages();
