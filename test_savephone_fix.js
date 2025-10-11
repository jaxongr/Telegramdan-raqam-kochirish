const { savePhone } = require('./src/database/models');
const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('=== SAVEPHONE FIX TEST ===\n');

    // Test raqam saqlash
    const testPhone = '+998901111111';
    const id = await savePhone(testPhone, 1, 'TEST FIX: Bu test xabari');
    console.log(`✅ Saqlandi, ID: ${id}\n`);

    // Database dan tekshirish
    const result = await query('SELECT * FROM phones WHERE phone = ?', [testPhone]);
    if (result.length === 0) {
      console.log('❌ Database da topilmadi!');
      process.exit(1);
    }

    const p = result[0];
    console.log('=== DATABASE DAN TEKSHIRISH ===');
    console.log(`ID: ${p.id}`);
    console.log(`Phone: ${p.phone}`);
    console.log(`Group ID: ${p.group_id}`);
    console.log(`First Date: ${p.first_date}`);
    console.log(`Last Date: ${p.last_date}`);
    console.log(`Repeat Count: ${p.repeat_count}`);
    console.log(`Lifetime Unique: ${p.lifetime_unique}`);
    console.log(`First Message: ${p.first_message ? p.first_message.substring(0, 50) : 'NULL'}`);

    // Natijani tekshirish
    if (p.id && p.first_date && p.repeat_count !== null && p.repeat_count !== undefined) {
      console.log('\n✅✅✅ FIX ISHLADI! Barcha maydonlar to\'ldirildi!');
    } else {
      console.log('\n❌ Hali ham muammo bor');
      console.log('Null maydonlar:');
      if (!p.id) console.log('  - id');
      if (!p.first_date) console.log('  - first_date');
      if (p.repeat_count === null || p.repeat_count === undefined) console.log('  - repeat_count');
    }

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error);
    process.exit(1);
  }
})();
