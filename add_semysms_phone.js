// SemySMS telefon qo'shish scripti
const { query } = require('./src/database/sqlite');

// DIQQAT: Bu yerda o'z SemySMS device ID va telefon raqamingizni kiriting!
const SEMYSMS_PHONES = [
  {
    phone: '998901234567', // O'zgartiring!
    device_id: 'YOUR_DEVICE_ID', // SemySMS.net dan oling!
    status: 'active'
  }
  // Yana telefonlar qo'shishingiz mumkin:
  // {
  //   phone: '998909876543',
  //   device_id: 'ANOTHER_DEVICE_ID',
  //   status: 'active'
  // }
];

async function addSemySMSPhones() {
  console.log('📱 SemySMS telefonlarni qo\'shish...\n');

  try {
    for (const phoneData of SEMYSMS_PHONES) {
      // Telefon mavjudligini tekshirish
      const existing = await query('SELECT * FROM semysms_phones WHERE phone = ?', [phoneData.phone]);

      if (existing.length > 0) {
        console.log(`⚠️  ${phoneData.phone} allaqachon mavjud - yangilanmoqda...`);
        await query(
          'UPDATE semysms_phones SET device_id = ?, status = ? WHERE phone = ?',
          [phoneData.device_id, phoneData.status, phoneData.phone]
        );
        console.log(`✅ Yangilandi: ${phoneData.phone}\n`);
      } else {
        await query(
          'INSERT INTO semysms_phones (phone, device_id, status) VALUES (?, ?, ?)',
          [phoneData.phone, phoneData.device_id, phoneData.status]
        );
        console.log(`✅ Qo'shildi: ${phoneData.phone}\n`);
      }
    }

    // Natijalarni ko'rsatish
    const allPhones = await query('SELECT * FROM semysms_phones');
    console.log(`\n📊 Jami ${allPhones.length} ta SemySMS telefon:\n`);
    allPhones.forEach((phone, idx) => {
      console.log(`${idx + 1}. ${phone.phone} (${phone.status})`);
      console.log(`   Device ID: ${phone.device_id}`);
      console.log(`   Balance: ${phone.balance || 0}`);
      console.log(`   Total sent: ${phone.total_sent || 0}\n`);
    });

    console.log('✅ Tayyor! Endi SMS yuborishingiz mumkin.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addSemySMSPhones();
