const axios = require('axios');

const API_KEY = '18fd59bd3733132a54ad01c5b9cf1556';
const BASE_URL = 'https://semysms.net/api/3';

async function testSemySMS() {
  try {
    console.log('🔍 SemySMS API testlash...\n');

    // 1. Balansni tekshirish
    console.log('1. Balansni tekshirish...');
    try {
      const balanceRes = await axios.get(`${BASE_URL}/balance.php`, {
        params: { token: API_KEY },
        timeout: 10000
      });
      console.log('✅ Balance:', balanceRes.data);
    } catch (err) {
      console.log('❌ Balance xatosi:', err.response?.status, err.message);
    }

    // 2. Qurilmalarni olish (to'g'ri endpoint)
    console.log('\n2. Qurilmalarni yuklash...');
    const devicesRes = await axios.get(`${BASE_URL}/devices.php`, {
      params: {
        token: API_KEY,
        is_arhive: 0  // Faqat aktiv qurilmalar
      },
      timeout: 10000
    });

    console.log('✅ API javobi:');
    console.log(JSON.stringify(devicesRes.data, null, 2));

    // Response strukturasini tekshirish
    if (devicesRes.data && devicesRes.data.items && Array.isArray(devicesRes.data.items)) {
      console.log('\n✅ Qurilmalar soni:', devicesRes.data.items.length);
      devicesRes.data.items.forEach((dev, i) => {
        console.log(`\n${i+1}. Device:`, dev);
      });
    } else if (Array.isArray(devicesRes.data)) {
      console.log('\n✅ Qurilmalar soni:', devicesRes.data.length);
      devicesRes.data.forEach((dev, i) => {
        console.log(`\n${i+1}. Device:`, dev);
      });
    } else {
      console.log('\n❓ Noma\'lum format:', typeof devicesRes.data);
    }

    return devicesRes.data;
  } catch (error) {
    console.error('\n❌ Xato:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSemySMS();
