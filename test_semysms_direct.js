const axios = require('axios');

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY || 'c83da9b60ac2fa1463887a85735cb711';
const SEMYSMS_API_URL = 'https://semysms.net/api/3';

async function testAPI() {
  console.log('=== SemySMS API Test ===\n');
  console.log(`API Key: ${SEMYSMS_API_KEY.substring(0, 10)}...`);
  console.log(`API URL: ${SEMYSMS_API_URL}\n`);

  // 1. Test balance.php
  console.log('1. Testing balance.php:');
  try {
    const response = await axios.get(`${SEMYSMS_API_URL}/balance.php`, {
      params: { token: SEMYSMS_API_KEY },
      timeout: 10000
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, response.data);
  } catch (error) {
    console.log(`   ❌ Status: ${error.response?.status || 'N/A'}`);
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   ❌ Response body:`, error.response.data);
    }
  }

  // 2. Test device.php
  console.log('\n2. Testing device.php:');
  try {
    const response = await axios.get(`${SEMYSMS_API_URL}/device.php`, {
      params: { token: SEMYSMS_API_KEY },
      timeout: 10000
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, response.data);
  } catch (error) {
    console.log(`   ❌ Status: ${error.response?.status || 'N/A'}`);
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   ❌ Response body:`, error.response.data);
    }
  }

  // 3. Test SMS yuborish (test raqamga)
  console.log('\n3. Testing sms.php (test mode - faqat validation):');
  console.log('   Device ID: 353889');
  console.log('   Test phone: +998901234567');

  try {
    const response = await axios.get(`${SEMYSMS_API_URL}/sms.php`, {
      params: {
        token: SEMYSMS_API_KEY,
        device: '353889',
        phone: '+998901234567',
        msg: 'Test SMS from diagnostics'
      },
      timeout: 10000
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, response.data);

    if (response.data && response.data.code === "0") {
      console.log(`   ✅ SMS API ishlayapti!`);
    } else {
      console.log(`   ⚠️ API javob berdi, lekin xato: ${response.data?.error || response.data?.message || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`   ❌ Status: ${error.response?.status || 'N/A'}`);
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   ❌ Response body:`, error.response.data);
    }
  }

  console.log('\n=== Test tugadi ===');
}

testAPI().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
