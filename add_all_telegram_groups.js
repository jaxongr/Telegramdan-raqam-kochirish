const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('🔄 Telegram guruhlarni bazaga qo\'shish...\n');

    // Telegram client'ni olish
    const MODE = process.env.MODE || 'server';
    const isServerMode = (MODE === 'server' || MODE === 'production');

    let client;
    if (isServerMode) {
      const telegramClient = require('./src/services/telegramClient');
      client = telegramClient.getClient();
    } else {
      const { getClient } = require('./src/services/telegramMonitor');
      client = getClient();
    }

    if (!client || !client.connected) {
      console.log('❌ Telegram client ulanmagan!');
      console.log('PM2 process ichida client ishlamoqda.');
      process.exit(1);
    }

    // Barcha dialoglarni olish
    const dialogs = await client.getDialogs({ limit: 200 });

    // Faqat guruhlar va kanallar
    const groups = dialogs.filter(d => d.isGroup || d.isChannel);

    console.log(`✅ Telegram'da ${groups.length} ta guruh/kanal topildi\n`);

    // Bazadagi mavjud guruhlar
    const existingGroups = await query('SELECT id, name, chat_id, active FROM groups');
    const existingChatIds = existingGroups.map(g => g.chat_id?.toString() || '');

    let added = 0;
    let alreadyExists = 0;
    let activated = 0;

    for (const dialog of groups) {
      try {
        // Chat ID
        let chatId = dialog.id.toString();

        // Channel/Megagroup uchun -100 prefix
        if (dialog.entity.className === 'Channel' && !chatId.startsWith('-')) {
          chatId = '-100' + chatId;
        }

        const name = dialog.title || dialog.name || 'Unknown';

        // Mavjudligini tekshirish
        const existing = existingGroups.find(g =>
          g.chat_id?.toString() === chatId
        );

        if (existing) {
          alreadyExists++;
          console.log(`  ✓ ${name} (mavjud)`);

          // Agar aktiv emas bo'lsa
          if (Number(existing.active) !== 1) {
            await query('UPDATE groups SET active = 1 WHERE id = ?', [existing.id]);
            activated++;
            console.log(`    → Aktivlashtirildi`);
          }
        } else {
          // Yangi guruh qo'shish
          await query(
            'INSERT INTO groups (name, chat_id, active, created_at) VALUES (?, ?, 1, datetime("now"))',
            [name, chatId]
          );
          added++;
          console.log(`  ✅ ${name} (yangi qo'shildi)`);
        }
      } catch (error) {
        console.error(`  ❌ Xato: ${dialog.title} - ${error.message}`);
      }
    }

    console.log('\n=== NATIJA ===');
    console.log(`Jami Telegram guruhlar: ${groups.length}`);
    console.log(`Yangi qo'shilgan: ${added}`);
    console.log(`Allaqachon mavjud: ${alreadyExists}`);
    console.log(`Aktivlashtirilgan: ${activated}`);

    // Yakuniy holatni ko'rsatish
    const allGroups = await query('SELECT COUNT(*) as count FROM groups');
    const activeGroups = await query('SELECT COUNT(*) as count FROM groups WHERE active = 1');

    console.log(`\nBazadagi jami guruhlar: ${allGroups[0].count}`);
    console.log(`Aktiv guruhlar: ${activeGroups[0].count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
