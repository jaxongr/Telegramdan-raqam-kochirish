const axios = require('axios');
const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY || 'c83da9b60ac2fa1463887a85735cb711';
const SEMYSMS_API_URL = 'https://semysms.net/api/3';

async function diagnostics() {
  console.log('=== SemySMS Diagnostika ===\n');

  // 1. Database dagi telefonlar
  console.log('1. Database dagi SemySMS telefonlar:');
  const phones = db.prepare('SELECT * FROM semysms_phones').all();

  phones.forEach(p => {
    console.log(`   Phone: ${p.phone}`);
    console.log(`     Device ID: ${p.device_id || 'NULL'}`);
    console.log(`     Balance: ${p.balance}`);
    console.log(`     Status: ${p.status}`);
    console.log(`     Last used: ${p.last_used || 'Never'}`);
    console.log(`     Total sent: ${p.total_sent}`);
    console.log('');
  });

  // 2. SemySMS API orqali balansni tekshirish
  console.log('\n2. SemySMS API orqali balans:');
  try {
    const response = await axios.get(`${SEMYSMS_API_URL}/balance.php`, {
      params: { token: SEMYSMS_API_KEY },
      timeout: 10000
    });

    console.log(`   API Response:`, response.data);

    if (response.data && response.data.balance !== undefined) {
      console.log(`   ✅ Balans: ${response.data.balance} so'm`);
    } else {
      console.log(`   ❌ Balans ma'lumoti topilmadi`);
    }
  } catch (error) {
    console.log(`   ❌ Balans tekshirishda xato: ${error.message}`);
  }

  // 3. SemySMS qurilmalarni olish
  console.log('\n3. SemySMS qurilmalar ro\'yxati:');
  try {
    const response = await axios.get(`${SEMYSMS_API_URL}/device.php`, {
      params: { token: SEMYSMS_API_KEY },
      timeout: 10000
    });

    console.log(`   API Response:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log(`   ❌ Qurilmalar ro'yxatini olishda xato: ${error.message}`);
  }

  db.close();
}

diagnostics().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
