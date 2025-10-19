const { sendSMS } = require('./src/services/smsService');

async function test() {
  console.log('=== Real-time SMS Test ===\n');

  const testPhone = '+998901234567';
  const testGroupId = 1;
  const testMessage = 'Test SMS - diagnostika';

  console.log(`Test phone: ${testPhone}`);
  console.log(`Message: ${testMessage}\n`);

  console.log('Sending SMS...\n');

  const result = await sendSMS(testPhone, testGroupId, testMessage);

  console.log('\n=== Natija ===');
  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    console.log(`\n❌ Xato: ${result.error}`);
  } else {
    console.log(`\n✅ SMS yuborildi! Sender: ${result.senderPhone}`);
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
