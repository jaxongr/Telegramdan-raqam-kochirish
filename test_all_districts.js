const { findMessagesByDistricts } = require('/root/telegram-sms/src/database/routes_with_districts');

(async () => {
  console.log('=== Qashqadaryo (barcha tarixiy xabarlar) ===\n');

  // 999999 daqiqa = ~694 kun
  const districts = await findMessagesByDistricts(386, 999999);

  console.log('Total districts found:', districts ? districts.length : 0);

  if (districts && districts.length > 0) {
    console.log('\nHar bir tuman:');
    districts.forEach(d => {
      console.log('  ' + d.district_name.padEnd(20) + ' - ' + d.phone_count + ' ta telefon');
    });

    const totalPhones = districts.reduce((sum, d) => sum + d.phone_count, 0);
    console.log('\n✅ Jami: ' + totalPhones + ' ta telefon raqam');
  } else {
    console.log('❌ Hech qanday tuman topilmadi!');
  }

  process.exit(0);
})();
