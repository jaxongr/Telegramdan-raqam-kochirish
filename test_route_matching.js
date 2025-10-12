const { findMatchingMessages } = require('/root/telegram-sms/src/database/routes');

(async () => {
  console.log('=== Testing Qashqadaryo route (ID=386) ===\n');

  const messages = await findMatchingMessages(386);

  console.log('Total matched messages:', messages.length);
  console.log('\nDistrict breakdown:');

  const districtCounts = {};
  messages.forEach(msg => {
    const text = (msg.message || '').toLowerCase();

    // Check which district it matches
    const districts = ['qarshi', 'shahrisabz', 'kitob', 'yakkabog', 'guzor', 'koson', 'chiroqchi', 'dehqonobod', 'muborak', 'nishon', 'kamashi'];

    districts.forEach(district => {
      if (text.includes(district)) {
        districtCounts[district] = (districtCounts[district] || 0) + 1;
      }
    });
  });

  console.log('\nHar bir tuman uchun mos keladigan xabarlar:');
  Object.entries(districtCounts).sort((a,b) => b[1] - a[1]).forEach(([district, count]) => {
    console.log('  ' + district.padEnd(15) + ': ' + count);
  });

  console.log('\n=== Sample message from "chiroqchi" ===');
  const chiroqchiMsg = messages.find(m => m.message.toLowerCase().includes('chiroqchi'));
  if (chiroqchiMsg) {
    console.log('Group:', chiroqchiMsg.group_name);
    console.log('Phones:', chiroqchiMsg.phones.length);
    console.log('Message:', chiroqchiMsg.message.substring(0, 200) + '...');
  } else {
    console.log('❌ NO chiroqchi messages found in matched results!');
  }

  process.exit(0);
})();
