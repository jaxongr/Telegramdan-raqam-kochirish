const { sendRouteSMS } = require('./src/services/routeSmsService');

async function test() {
  console.log('📤 Route 2396 uchun SMS yuborish boshlandi...\n');

  const result = await sendRouteSMS(2396);

  console.log('\n📊 Natija:');
  console.log(JSON.stringify(result, null, 2));

  // Xatolarni tekshirish
  if (result.failedCount > 0) {
    const { getRouteSMSLogs } = require('./src/database/routes');
    const logs = await getRouteSMSLogs(2396, 5);

    console.log('\n❌ Oxirgi xatolar:');
    logs.filter(l => l.status === 'failed').slice(0, 3).forEach(log => {
      console.log(`  ${log.to_phone}: ${log.error || 'Unknown error'}`);
    });
  }
}

test().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
