#!/usr/bin/env node
/**
 * SemySMS qurilma qo'shish scripti
 *
 * Ishlatish:
 * node add_device.js <telefon_raqam> <device_id>
 *
 * Misol:
 * node add_device.js +998901234567 12345
 */

require('dotenv').config();
const { createSemySMSPhone } = require('./src/database/models');
const { checkBalance } = require('./src/services/smsService');

async function addDevice() {
  const phone = process.argv[2];
  const deviceId = process.argv[3];

  if (!phone || !deviceId) {
    console.error('❌ Xato: Telefon va Device ID majburiy!');
    console.log('\n📝 Ishlatish:');
    console.log('  node add_device.js <telefon_raqam> <device_id>');
    console.log('\n💡 Misol:');
    console.log('  node add_device.js +998901234567 12345');
    process.exit(1);
  }

  try {
    console.log('🔍 Balans tekshirilmoqda...');
    const balance = await checkBalance(phone);

    console.log(`📱 Qurilma qo'shilmoqda...`);
    console.log(`   Telefon: ${phone}`);
    console.log(`   Device ID: ${deviceId}`);
    console.log(`   Balans: ${balance || 0} so'm`);

    await createSemySMSPhone(phone, balance || 0, deviceId);

    console.log('✅ Qurilma muvaffaqiyatli qo\'shildi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    process.exit(1);
  }
}

addDevice();
