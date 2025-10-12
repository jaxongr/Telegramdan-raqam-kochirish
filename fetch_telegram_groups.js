const { getClient } = require('./src/telegram/client');
const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('🔍 Telegram clientdan guruhlarni olish...\n');

    const client = await getClient();

    // Get all dialogs (including groups)
    const dialogs = await client.getDialogs({ limit: 100 });

    const groups = dialogs.filter(d =>
      d.isGroup || d.isChannel
    );

    console.log(`✅ Telegram'da ${groups.length} ta guruh/kanal topildi:\n`);

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const chatId = group.id?.toString() || '';
      const name = group.title || group.name || 'Unknown';

      console.log(`[${i + 1}] ${name}`);
      console.log(`    Chat ID: ${chatId}`);
      console.log(`    Type: ${group.isGroup ? 'Group' : 'Channel'}`);

      // Check if already in database
      const existing = await query(
        'SELECT id, name, active FROM groups WHERE chat_id = ? OR name = ?',
        [chatId, name]
      );

      if (existing && existing.length > 0) {
        console.log(`    ✓ Bazada mavjud (ID: ${existing[0].id}, Active: ${existing[0].active})`);
      } else {
        console.log(`    ✗ Bazada YO'Q - qo'shish kerak`);

        // Add to database
        try {
          await query(
            'INSERT INTO groups (name, chat_id, active, created_at) VALUES (?, ?, 1, datetime("now"))',
            [name, chatId]
          );
          console.log(`    ✅ Bazaga qo'shildi!`);
        } catch (err) {
          console.log(`    ❌ Xato: ${err.message}`);
        }
      }
      console.log();
    }

    console.log('\n=== Yakuniy natija ===');
    const allGroups = await query('SELECT COUNT(*) as count FROM groups WHERE active = 1');
    console.log(`Aktiv guruhlar soni: ${allGroups[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
