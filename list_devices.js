#!/usr/bin/env node
/**
 * SemySMS qurilmalar ro'yxatini ko'rsatish
 */

require('dotenv').config();
const axios = require('axios');

async function listDevices() {
  try {
    const apiKey = process.env.SEMYSMS_API_KEY;

    if (!apiKey) {
      console.error('❌ SEMYSMS_API_KEY topilmadi .env faylda');
      process.exit(1);
    }

    console.log('🔍 SemySMS qurilmalar tekshirilmoqda...\n');

    const response = await axios.get('https://semysms.net/api/3/devices.php', {
      params: { token: apiKey },
      timeout: 10000
    });

    const result = response.data;

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.log('📭 Qurilmalar topilmadi.');
      return;
    }

    const devices = result.data;

    console.log('📱 SEMYSMS QURILMALAR RO\'YXATI:\n');
    console.log('─'.repeat(80));
    console.log(`Jami: ${result.count} ta qurilma\n`);

    // Faol qurilmalarni ajratish
    const activeDevices = devices.filter(d => d.is_arhive === 0);
    const archivedDevices = devices.filter(d => d.is_arhive === 1);

    if (activeDevices.length > 0) {
      console.log('🟢 FAOL QURILMALAR:\n');
      activeDevices.forEach((device, index) => {
        const phone = device.phone_number || device.dop_name || 'N/A';
        const operator = device.mobile_operator || 'N/A';
        const battery = device.bat || 0;
        const lastActive = device.date_last_active || 'N/A';

        console.log(`${index + 1}. Device ID: ${device.id}`);
        console.log(`   Nomi:      ${device.device_name}`);
        console.log(`   Raqam:     ${phone}`);
        console.log(`   Operator:  ${operator}`);
        console.log(`   Batareya:  ${battery}%`);
        console.log(`   Oxirgi:    ${lastActive}`);
        console.log(`   SMS tezlik: ${device.speed_sms}/min`);
        console.log('─'.repeat(80));
      });
    }

    if (archivedDevices.length > 0) {
      console.log('\n⚫ ARXIVLANGAN QURILMALAR:\n');
      archivedDevices.forEach((device, index) => {
        const phone = device.phone_number || device.dop_name || 'N/A';
        console.log(`${index + 1}. Device ID: ${device.id} | ${device.device_name} | ${phone}`);
      });
      console.log('─'.repeat(80));
    }

    console.log(`\n✅ Faol: ${activeDevices.length} | Arxiv: ${archivedDevices.length}\n`);
    console.log('💡 Qo\'shish uchun:');
    console.log('   node add_device.js +998XXXXXXXXX <device_id>\n');
    console.log('📌 Misol (birinchi faol qurilma):');
    if (activeDevices.length > 0) {
      const firstDevice = activeDevices[0];
      const phone = firstDevice.dop_name ? `+998${firstDevice.dop_name}` : '+998901234567';
      console.log(`   node add_device.js ${phone} ${firstDevice.id}\n`);
    }

  } catch (error) {
    console.error('❌ Xato:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

listDevices();
