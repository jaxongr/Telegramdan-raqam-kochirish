// SemySMS telefonlarni tekshirish va qo'shish scripti
const { query } = require('./src/database/sqlite');

async function checkSemySMSPhones() {
  console.log('📱 SemySMS telefonlarni tekshirish...\n');

  try {
    // Barcha SemySMS telefonlarni olish
    const phones = await query('SELECT * FROM semysms_phones');

    console.log(`✅ Database'da ${phones.length} ta SemySMS telefon topildi:\n`);

    if (phones.length === 0) {
      console.log('⚠️  HECH QANDAY SEMYSMS TELEFON YO\'Q!\n');
      console.log('📝 SemySMS telefon qo\'shish uchun:');
      console.log('   1. Web dashboard\'ga kiring: http://localhost:3000');
      console.log('   2. "SMS Settings" bo\'limiga o\'ting');
      console.log('   3. "Add SemySMS Phone" tugmasini bosing\n');
      console.log('📝 Yoki manual SQL bilan qo\'shish:');
      console.log(`   INSERT INTO semysms_phones (phone, device_id, status) VALUES ('998901234567', 'device_123', 'active');\n`);
    } else {
      phones.forEach((phone, idx) => {
        console.log(`${idx + 1}. Phone: ${phone.phone}`);
        console.log(`   Device ID: ${phone.device_id || 'N/A'}`);
        console.log(`   Status: ${phone.status}`);
        console.log(`   Balance: ${phone.balance || 0}`);
        console.log(`   Total sent: ${phone.total_sent || 0}`);
        console.log(`   Last used: ${phone.last_used || 'Never'}\n`);
      });
    }

    // SMS logs'ni ham tekshirish
    const smsLogs = await query('SELECT COUNT(*) as count FROM sms_logs');
    console.log(`📊 SMS Logs: ${smsLogs[0].count} ta yozuv\n`);

    // Route SMS logs
    const routeSmsLogs = await query('SELECT COUNT(*) as count FROM route_sms_logs');
    console.log(`📊 Route SMS Logs: ${routeSmsLogs[0].count} ta yozuv\n`);

    // Oxirgi 5 ta SMS log
    const recentSMS = await query('SELECT * FROM route_sms_logs ORDER BY sent_at DESC LIMIT 5');
    if (recentSMS.length > 0) {
      console.log('📜 Oxirgi 5 ta SMS:\n');
      recentSMS.forEach((sms, idx) => {
        console.log(`${idx + 1}. To: ${sms.to_phone}`);
        console.log(`   Message: ${sms.message?.substring(0, 50)}...`);
        console.log(`   Status: ${sms.status}`);
        console.log(`   Sent: ${sms.sent_at}\n`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    process.exit(1);
  }
}

checkSemySMSPhones();
