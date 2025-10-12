/**
 * ROUTE_MESSAGES ICHIDA DUBLIKAT TELEFON RAQAMLARNI TOZALASH
 * Bir yo'nalishda bir xil raqam bir nechta elonda bo'lsa, faqat birinchisini qoldirish
 */

const { query } = require('./src/database/sqlite');

async function fixDuplicatePhonesInRoutes() {
  console.log('TELEFON RAQAM DUBLIKATLARINI TOZALASH...\n');

  try {
    // Barcha yo'nalishlarni olish
    const routes = await query('SELECT DISTINCT route_id FROM route_messages ORDER BY route_id');
    console.log(`Jami yonalishlar: ${routes.length} ta\n`);

    let totalCleaned = 0;
    let totalDeleted = 0;

    for (const routeRow of routes) {
      const routeId = routeRow.route_id || routeRow.ROUTE_ID;
      console.log(`\n=== Route ID ${routeId} ===`);

      // Shu yo'nalishdagi barcha xabarlar
      const messages = await query(
        'SELECT id, phone_numbers, created_at FROM route_messages WHERE route_id = ? ORDER BY created_at ASC',
        [routeId]
      );

      console.log(`  Jami elonlar: ${messages.length} ta`);

      // Barcha mavjud raqamlarni track qilish
      const seenPhones = new Set();
      const messagesToDelete = [];

      for (const msg of messages) {
        const msgId = msg.id || msg.ID;
        const phones = JSON.parse(msg.phone_numbers || '[]');

        // Faqat yangi raqamlarni qoldirish
        const newPhones = phones.filter(phone => !seenPhones.has(phone));

        if (newPhones.length === 0) {
          // Barcha raqamlar dublikat - elonni o'chirish
          messagesToDelete.push(msgId);
          console.log(`    Elon ID ${msgId}: OCHIRILDI (barcha raqamlar dublikat)`);
          totalDeleted++;
        } else if (newPhones.length < phones.length) {
          // Ba'zi raqamlar dublikat - faqat yangilarni saqlash
          await query(
            'UPDATE route_messages SET phone_numbers = ? WHERE id = ?',
            [JSON.stringify(newPhones), msgId]
          );
          console.log(`    Elon ID ${msgId}: ${phones.length} → ${newPhones.length} ta raqam (${phones.length - newPhones.length} ta dublikat olib tashlandi)`);
          totalCleaned++;
        }

        // Yangi raqamlarni seenPhones ga qo'shish
        newPhones.forEach(phone => seenPhones.add(phone));
      }

      // O'chirilishi kerak bo'lgan elonlarni o'chirish
      for (const msgId of messagesToDelete) {
        await query('DELETE FROM route_messages WHERE id = ?', [msgId]);
      }

      console.log(`  Tozalangan: ${totalCleaned} ta elon`);
      console.log(`  Ochirilgan: ${totalDeleted} ta elon (barcha raqamlar dublikat edi)`);
    }

    console.log(`\n\n=== NATIJA ===`);
    console.log(`  Tozalangan elonlar: ${totalCleaned} ta`);
    console.log(`  Ochirilgan elonlar: ${totalDeleted} ta`);
    console.log(`\nHAMMA TAYYOR!\n`);

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicatePhonesInRoutes();
