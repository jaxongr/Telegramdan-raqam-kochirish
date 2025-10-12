/**
 * DUBLIKAT TELEFON RAQAMLARNI TOZALASH
 * Bir xil telefon raqam bir nechta marta saqlangan bo'lsa, faqat eng yangisini qoldirish
 */

const { query } = require('./src/database/sqlite');

async function fixDuplicatePhones() {
  console.log('🔧 DUBLIKAT TELEFON RAQAMLARNI TOZALASH...\n');

  try {
    // 1. Dublikat telefon raqamlarni topish
    const duplicates = await query(`
      SELECT phone, group_id, COUNT(*) as count
      FROM phones
      GROUP BY phone, group_id
      HAVING COUNT(*) > 1
    `);

    console.log(`📊 Topilgan dublikatlar: ${duplicates.length} ta\n`);

    if (duplicates.length === 0) {
      console.log('✅ Dublikat telefon raqamlar yo\'q!\n');
      process.exit(0);
    }

    let totalDeleted = 0;

    // 2. Har bir dublikat uchun faqat eng yangisini qoldirish
    for (const dup of duplicates) {
      console.log(`   📞 ${dup.phone} (${dup.count} marta)`);

      // Eng yangi yozuvni topish
      const allRecords = await query(
        'SELECT id FROM phones WHERE phone = ? AND group_id = ? ORDER BY last_date DESC',
        [dup.phone, dup.group_id]
      );

      if (allRecords.length > 1) {
        // Birinchisidan tashqari barchasini o'chirish
        const idsToDelete = allRecords.slice(1).map(r => r.id || r.ID);

        for (const id of idsToDelete) {
          await query('DELETE FROM phones WHERE id = ?', [id]);
          totalDeleted++;
        }

        console.log(`      ✓ ${idsToDelete.length} ta eski yozuv o'chirildi`);
      }
    }

    console.log(`\n✅ TOZALASH TUGADI!`);
    console.log(`   Jami o'chirilgan: ${totalDeleted} ta dublikat\n`);

    // 3. Natijani tekshirish
    const remainingDuplicates = await query(`
      SELECT phone, group_id, COUNT(*) as count
      FROM phones
      GROUP BY phone, group_id
      HAVING COUNT(*) > 1
    `);

    if (remainingDuplicates.length === 0) {
      console.log('✅ Dublikatlar butunlay tozalandi!\n');
    } else {
      console.log(`⚠️  Hali ${remainingDuplicates.length} ta dublikat qoldi\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicatePhones();
