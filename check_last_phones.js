const { query } = require('./src/database/sqlite');

(async () => {
  try {
    const lastPhones = await query('SELECT phone, group_id, first_date FROM phones ORDER BY first_date DESC LIMIT 20');

    console.log('\n=== OXIRGI 20 TA RAQAM ===\n');
    console.log('Phone         | Group | Date');
    console.log('--------------|-------|---------------------');

    if (lastPhones.length === 0) {
      console.log('Hech qanday raqam topilmadi\n');
    } else {
      lastPhones.forEach(row => {
        console.log(`${row.phone.padEnd(13)} | ${row.group_id.toString().padStart(5)} | ${row.first_date}`);
      });
    }

    // Eng oxirgi raqam qachon qo'shilgan
    if (lastPhones.length > 0) {
      const lastDate = new Date(lastPhones[0].first_date);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastDate) / 1000 / 60);

      console.log(`\n📊 Eng oxirgi raqam ${diffMinutes} daqiqa oldin qo'shilgan`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error);
    process.exit(1);
  }
})();
