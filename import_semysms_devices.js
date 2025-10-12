// SemySMS'dan barcha qurilmalarni avtomatik import qilish
const axios = require('axios');
const { query } = require('./src/database/sqlite');
require('dotenv').config();

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY;
const SEMYSMS_API_URL = 'https://semysms.net/api/3';

async function importSemySMSDevices() {
  console.log('📱 SemySMS qurilmalarni import qilish...\n');

  if (!SEMYSMS_API_KEY) {
    console.error('❌ SEMYSMS_API_KEY topilmadi! .env faylni tekshiring.');
    process.exit(1);
  }

  try {
    // 1. SemySMS'dan barcha qurilmalarni olish
    console.log("🔍 SemySMS API'ga so'rov yuborilmoqda...");
    console.log(`   URL: ${SEMYSMS_API_URL}/devices.php`);
    console.log(`   API Key: ${SEMYSMS_API_KEY.substring(0, 10)}...`);

    const response = await axios.get(`${SEMYSMS_API_URL}/devices.php`, {
      params: {
        token: SEMYSMS_API_KEY,
        is_arhive: 0 // Faqat faol qurilmalar
      },
      timeout: 15000
    });

    console.log('\n📊 API Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Response formati tekshirish
    if (!response.data) {
      console.error("\n❌ API response bo'sh!");
      process.exit(1);
    }

    // Response array yoki object bo'lishi mumkin
    let devices = [];

    if (Array.isArray(response.data)) {
      devices = response.data;
    } else if (typeof response.data === 'object') {
      // Agar object bo'lsa, values'ni olish
      devices = Object.values(response.data);
    }

    if (devices.length === 0) {
      console.warn("\n⚠️  Hech qanday qurilma topilmadi!");
      console.log("   SemySMS.net saytida qurilma qo'shing.");
      process.exit(0);
    }

    console.log(`\n✅ ${devices.length} ta qurilma topildi\n`);

    // 2. Har bir qurilmani database'ga qo'shish
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const device of devices) {
      try {
        // Device ma'lumotlarini olish (SemySMS API format)
        const deviceId = device.id; // SemySMS'da 'id' maydoni device ID
        const deviceName = device.device_name || device.name || `Device ${deviceId}`;
        const deviceNumber = device.dop_name || device.phone_number || device.phone || ''; // dop_name = telefon raqam
        const isActive = device.is_work === 1 || device.status === 'active';

        console.log(`📱 Qurilma: ${deviceName}`);
        console.log(`   ID: ${deviceId}`);
        console.log(`   Raqam: ${deviceNumber || 'N/A'}`);
        console.log(`   Holat: ${isActive ? 'active' : 'inactive'}`);

        if (!deviceId) {
          console.log(`   ⚠️  Device ID topilmadi - o'tkazib yuborildi\n`);
          skipped++;
          continue;
        }

        // Agar telefon raqam bo'lmasa, device ID'ni phone sifatida ishlatamiz
        const phone = deviceNumber ? deviceNumber.replace(/\D/g, '') : `device_${deviceId}`;

        // Database'da mavjudligini tekshirish
        const existing = await query(
          'SELECT * FROM semysms_phones WHERE device_id = ?',
          [deviceId.toString()]
        );

        if (existing.length > 0) {
          // Yangilash
          await query(
            'UPDATE semysms_phones SET phone = ?, status = ? WHERE device_id = ?',
            [phone, isActive ? 'active' : 'inactive', deviceId.toString()]
          );
          console.log(`   ✅ Yangilandi\n`);
          updated++;
        } else {
          // Qo'shish
          await query(
            'INSERT INTO semysms_phones (phone, device_id, status, balance) VALUES (?, ?, ?, ?)',
            [phone, deviceId.toString(), isActive ? 'active' : 'inactive', 0]
          );
          console.log(`   ✅ Qo'shildi\n`);
          imported++;
        }

      } catch (deviceError) {
        console.error(`   ❌ Xato: ${deviceError.message}\n`);
        skipped++;
      }
    }

    // 3. Natijalar
    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT NATIJALARI:');
    console.log('='.repeat(50));
    console.log(`✅ Yangi qo'shildi:  ${imported}`);
    console.log(`🔄 Yangilandi:      ${updated}`);
    console.log(`⏭️  O'tkazib yuborildi: ${skipped}`);
    console.log(`📱 Jami:           ${devices.length}`);
    console.log('='.repeat(50));

    // 4. Database'dagi barcha SemySMS telefonlarni ko'rsatish
    const allPhones = await query('SELECT * FROM semysms_phones ORDER BY id');
    console.log(`\n📋 Database'dagi barcha SemySMS telefonlar (${allPhones.length} ta):\n`);

    allPhones.forEach((phone, idx) => {
      console.log(`${idx + 1}. Phone: ${phone.phone}`);
      console.log(`   Device ID: ${phone.device_id}`);
      console.log(`   Status: ${phone.status}`);
      console.log(`   Balance: ${phone.balance || 0}`);
      console.log(`   Total sent: ${phone.total_sent || 0}\n`);
    });

    console.log('✅ Import tugadi! Endi SMS yuborishingiz mumkin.\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ XATO:', error.message);

    if (error.response) {
      console.error('API Response:', error.response.status);
      console.error('API Data:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 SemySMS API ga ulanish xatosi. Internet ulanishini tekshiring.');
    }

    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Scriptni ishga tushirish
console.log('╔════════════════════════════════════════════════╗');
console.log('║   SemySMS Qurilmalar Auto Import Scripti      ║');
console.log('╚════════════════════════════════════════════════╝\n');

importSemySMSDevices();
