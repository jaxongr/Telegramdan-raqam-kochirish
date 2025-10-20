const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🧹 ESKI DUBLIKAT E\'LONLARNI TOZALASH:\n');

  // Barcha route'larni olish
  const routes = await query('SELECT id, name FROM routes WHERE active = 1');

  let totalDeleted = 0;
  let totalRemaining = 0;

  for (const route of routes) {
    console.log(`\n📍 ${route.name} (ID: ${route.id})`);

    // Bu route'ning barcha e'lonlari
    const messages = await query(
      'SELECT id, phone_numbers, message_date FROM route_messages WHERE route_id = ? ORDER BY message_date DESC',
      [route.id]
    );

    console.log(`   Jami e'lonlar: ${messages.length}`);

    // Telefon raqamlar bo'yicha guruhlash
    const phoneGroups = {};

    messages.forEach(msg => {
      try {
        const phones = JSON.parse(msg.phone_numbers || '[]');
        const phoneKey = phones.sort().join(',');

        if (!phoneGroups[phoneKey]) {
          phoneGroups[phoneKey] = [];
        }

        phoneGroups[phoneKey].push({
          id: msg.id,
          date: new Date(msg.message_date)
        });
      } catch (e) {
        // JSON parse xato
      }
    });

    // Har bir guruhda faqat eng yangi e'lonni qoldirish, qolganlarini o'chirish
    const toDelete = [];

    Object.values(phoneGroups).forEach(group => {
      if (group.length > 1) {
        // Vaqt bo'yicha saralash (eng yangi birinchi)
        group.sort((a, b) => b.date - a.date);

        // Eng yangisidan tashqari barchasini o'chirish
        for (let i = 1; i < group.length; i++) {
          toDelete.push(group[i].id);
        }
      }
    });

    if (toDelete.length > 0) {
      // O'chirish
      await query(
        `DELETE FROM route_messages WHERE id IN (${toDelete.join(',')})`,
        []
      );
      console.log(`   🗑️  ${toDelete.length} ta dublikat o'chirildi`);
      totalDeleted += toDelete.length;
    } else {
      console.log(`   ✅ Dublikat yo'q`);
    }

    // Qolgan e'lonlar
    const remaining = messages.length - toDelete.length;
    console.log(`   📊 Qoldi: ${remaining} ta e'lon`);
    totalRemaining += remaining;
  }

  console.log(`\n\n📊 JAMI NATIJA:`);
  console.log(`   🗑️  O'chirildi: ${totalDeleted} ta dublikat e'lon`);
  console.log(`   ✅ Qoldi: ${totalRemaining} ta unikal e'lon`);
  console.log('\n✅ Tozalash tugadi!\n');

  process.exit(0);
})();
