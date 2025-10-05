const { getActiveAccounts } = require('./src/database/sqlite');
const { getClient } = require('./src/services/multiAccountManager');

async function checkBalance() {
  console.log('📊 REAL Telegram Balance Tekshiruv:\n');

  const accounts = getActiveAccounts();

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);
      const dialogs = await client.getDialogs({ limit: 500 });

      let groupCount = 0;
      for (const dialog of dialogs) {
        const entity = dialog.entity;
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          groupCount++;
        }
      }

      console.log(`  📱 ${account.phone}: ${groupCount} guruh`);

    } catch (error) {
      console.log(`  ❌ ${account.phone}: Xato - ${error.message}`);
    }
  }

  console.log('\n✅ Tekshiruv tugadi');
  process.exit(0);
}

checkBalance().catch(err => {
  console.error('Xato:', err);
  process.exit(1);
});
