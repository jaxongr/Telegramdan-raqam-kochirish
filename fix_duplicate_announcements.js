/**
 * DUBLIKAT E'LONLARNI TOZALASH
 * Bir xil xabar bir nechta yo'nalishda bo'lsa, faqat birinchisini qoldirish
 */

const { query } = require('./src/database/sqlite');

async function fixDuplicateAnnouncements() {
  console.log('🔧 DUBLIKAT E\'LONLARNI TOZALASH...\n');

  try {
    // 1. Barcha route_messages ni olish
    const allMessages = await query('SELECT * FROM route_messages ORDER BY created_at ASC');
    console.log(`📊 Jami e'lonlar: ${allMessages.length} ta\n`);

    // 2. Dublikatlarni topish (bir xil route_id + message_text)
    // group_id farq qilishi mumkin, lekin bir yo'nalishda bir xil matn faqat 1 marta!
    const seen = new Map(); // key: "routeId|messageText", value: first message record
    const duplicates = [];

    for (const msg of allMessages) {
      const key = `${msg.route_id}|${msg.message_text}`;

      if (seen.has(key)) {
        // Bu dublikat!
        duplicates.push({
          duplicate: msg,
          original: seen.get(key)
        });
      } else {
        // Birinchi marta ko'rilayotgan xabar
        seen.set(key, msg);
      }
    }

    console.log(`🔍 Topilgan dublikatlar: ${duplicates.length} ta\n`);

    if (duplicates.length === 0) {
      console.log('✅ Dublikat e\'lonlar yo\'q!\n');
      process.exit(0);
    }

    let deletedCount = 0;
    let mergedPhones = 0;

    // 3. Har bir dublikat uchun
    for (const { duplicate, original } of duplicates) {
      // Original va duplicate telefon raqamlarni birlashtirish
      const originalPhones = JSON.parse(original.phone_numbers || '[]');
      const duplicatePhones = JSON.parse(duplicate.phone_numbers || '[]');
      const combinedPhones = [...new Set([...originalPhones, ...duplicatePhones])];

      console.log(`   📞 E'lon ID ${duplicate.id}:`);
      console.log(`      Original: ${original.id} (${originalPhones.length} ta raqam)`);
      console.log(`      Dublikat: ${duplicate.id} (${duplicatePhones.length} ta raqam)`);
      console.log(`      Birlashtirilgan: ${combinedPhones.length} ta unikal raqam`);

      // Original ni yangilash
      if (combinedPhones.length > originalPhones.length) {
        await query(
          'UPDATE route_messages SET phone_numbers = ? WHERE id = ?',
          [JSON.stringify(combinedPhones), original.id]
        );
        mergedPhones++;
        console.log(`      ✓ Telefon raqamlar birlashtirildi`);
      }

      // Dublikatni o'chirish
      await query('DELETE FROM route_messages WHERE id = ?', [duplicate.id]);
      deletedCount++;
      console.log(`      ✓ Dublikat o'chirildi\n`);
    }

    console.log(`\n✅ TOZALASH TUGADI!`);
    console.log(`   O'chirilgan dublikatlar: ${deletedCount} ta`);
    console.log(`   Birlashtirilgan telefon raqamlar: ${mergedPhones} ta e'londa\n`);

    // 4. Natijani tekshirish
    const finalCount = await query('SELECT COUNT(*) as count FROM route_messages');
    console.log(`📊 Qolgan e'lonlar: ${finalCount[0].count || finalCount[0].COUNT} ta\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicateAnnouncements();
