const { getDialogs, getClient } = require('./src/services/telegramClient');
const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('🔍 Telegram clientdan guruhlarni olish...\n');

    // Check if client is connected
    const client = getClient();
    if (!client || !client.connected) {
      console.log('❌ Telegram client ulanmagan!');
      console.log('Iltimos, avval tizimni ishga tushiring.');
      process.exit(1);
    }

    // Get all dialogs
    const groups = await getDialogs();

    console.log(`✅ Telegram'da ${groups.length} ta guruh/kanal topildi:\n`);

    let added = 0;
    let existing = 0;
    let errors = 0;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const chatId = group.telegramId || '';
      const name = group.title || 'Unknown';

      console.log(`[${i + 1}] ${name}`);
      console.log(`    Chat ID: ${chatId}`);

      // Check if already in database
      const existingGroup = await query(
        'SELECT id, name, active FROM groups WHERE chat_id = ?',
        [chatId]
      );

      if (existingGroup && existingGroup.length > 0) {
        console.log(`    ✓ Bazada mavjud (ID: ${existingGroup[0].id}, Active: ${existingGroup[0].active})`);
        existing++;

        // Update to active if not already
        if (Number(existingGroup[0].active) !== 1) {
          await query('UPDATE groups SET active = 1 WHERE id = ?', [existingGroup[0].id]);
          console.log(`    ✅ Aktiv qilindi!`);
        }
      } else {
        console.log(`    ✗ Bazada YO'Q - qo'shilmoqda...`);

        // Add to database
        try {
          await query(
            'INSERT INTO groups (name, chat_id, active, created_at) VALUES (?, ?, 1, datetime("now"))',
            [name, chatId]
          );
          console.log(`    ✅ Bazaga qo'shildi!`);
          added++;
        } catch (err) {
          console.log(`    ❌ Xato: ${err.message}`);
          errors++;
        }
      }
      console.log();
    }

    console.log('\n=== Yakuniy natija ===');
    console.log(`Yangi qo'shilgan: ${added} ta`);
    console.log(`Allaqachon mavjud: ${existing} ta`);
    console.log(`Xatolar: ${errors} ta`);

    const allGroups = await query('SELECT COUNT(*) as count FROM groups');
    console.log(`\nJami bazadagi guruhlar: ${allGroups[0].count} ta`);

    const activeGroups = await query('SELECT id, name, chat_id FROM groups WHERE active = 1');
    console.log(`Aktiv guruhlar: ${activeGroups.length} ta\n`);

    activeGroups.forEach((g, idx) => {
      console.log(`  ${idx + 1}. ${g.name} (ID: ${g.id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
