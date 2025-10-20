const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n📊 E\'LONLAR VA RAQAMLAR TAHLILI:\n');

  // Yakkabog yo'nalishi
  const yakkabog = await query(`SELECT * FROM routes WHERE name LIKE '%Yakkabog%'`);

  if (yakkabog.length > 0) {
    const routeId = yakkabog[0].id;

    const messages = await query(`
      SELECT id, phone_numbers, message_date
      FROM route_messages
      WHERE route_id = ?
      ORDER BY message_date DESC
      LIMIT 150
    `, [routeId]);

    console.log(`🔵 Yakkabog yo'nalishi:`);
    console.log(`   Jami e'lonlar: ${messages.length}`);

    // Telefon raqamlarni to'plash
    const allPhones = new Set();
    const phoneGroups = {};

    messages.forEach(msg => {
      const phones = msg.phone_numbers ? JSON.parse(msg.phone_numbers) : [];
      const phoneKey = phones.sort().join(',');

      if (!phoneGroups[phoneKey]) {
        phoneGroups[phoneKey] = [];
      }
      phoneGroups[phoneKey].push({
        id: msg.id,
        date: msg.message_date,
        phones: phones
      });

      phones.forEach(p => allPhones.add(p));
    });

    console.log(`   Unikal raqamlar: ${allPhones.size}`);
    console.log('');

    // Dublikat e'lonlarni ko'rsatish
    const duplicates = Object.entries(phoneGroups).filter(([key, msgs]) => msgs.length > 1);

    if (duplicates.length > 0) {
      console.log(`   ⚠️  Dublikat e'lonlar: ${duplicates.length} guruh`);
      console.log('');

      duplicates.slice(0, 5).forEach(([phoneKey, msgs], i) => {
        console.log(`   ${i+1}. Raqamlar: ${msgs[0].phones.join(', ')}`);
        console.log(`      Takrorlandi: ${msgs.length} marta`);
        msgs.slice(0, 3).forEach((msg, j) => {
          const date = new Date(msg.date + 'Z').toLocaleString('uz-UZ', {timeZone: 'Asia/Tashkent'});
          console.log(`         ${j+1}) ID: ${msg.id}, Vaqt: ${date}`);
        });
        console.log('');
      });
    }
  }

  // Shahrisabz yo'nalishi
  const shahrisabz = await query(`SELECT * FROM routes WHERE name LIKE '%Shahrisabz%'`);

  if (shahrisabz.length > 0) {
    const routeId = shahrisabz[0].id;

    const messages = await query(`
      SELECT id, phone_numbers, message_date
      FROM route_messages
      WHERE route_id = ?
      ORDER BY message_date DESC
      LIMIT 70
    `, [routeId]);

    console.log(`🔵 Shahrisabz yo'nalishi:`);
    console.log(`   Jami e'lonlar: ${messages.length}`);

    // Telefon raqamlarni to'plash
    const allPhones = new Set();
    const phoneGroups = {};

    messages.forEach(msg => {
      const phones = msg.phone_numbers ? JSON.parse(msg.phone_numbers) : [];
      const phoneKey = phones.sort().join(',');

      if (!phoneGroups[phoneKey]) {
        phoneGroups[phoneKey] = [];
      }
      phoneGroups[phoneKey].push({
        id: msg.id,
        date: msg.message_date,
        phones: phones
      });

      phones.forEach(p => allPhones.add(p));
    });

    console.log(`   Unikal raqamlar: ${allPhones.size}`);
    console.log('');

    // Dublikat e'lonlarni ko'rsatish
    const duplicates = Object.entries(phoneGroups).filter(([key, msgs]) => msgs.length > 1);

    if (duplicates.length > 0) {
      console.log(`   ⚠️  Dublikat e'lonlar: ${duplicates.length} guruh`);
      console.log('');

      duplicates.slice(0, 5).forEach(([phoneKey, msgs], i) => {
        console.log(`   ${i+1}. Raqamlar: ${msgs[0].phones.join(', ')}`);
        console.log(`      Takrorlandi: ${msgs.length} marta`);
        msgs.slice(0, 3).forEach((msg, j) => {
          const date = new Date(msg.date + 'Z').toLocaleString('uz-UZ', {timeZone: 'Asia/Tashkent'});
          console.log(`         ${j+1}) ID: ${msg.id}, Vaqt: ${date}`);
        });
        console.log('');
      });
    }
  }

  process.exit(0);
})();
