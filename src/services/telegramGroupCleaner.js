const logger = require('../utils/logger');
const { getActiveAccounts, db } = require('../database/sqlite');
const { getClient } = require('./multiAccountManager');
const { Api } = require('telegram');

/**
 * TELEGRAM'DAN GURUHLARNI UNIKALLASHTIRUV
 * Har bir guruhni faqat bitta akkauntda qoldirish
 */
async function cleanDuplicateGroupsFromTelegram() {
  const accounts = getActiveAccounts();

  if (accounts.length === 0) {
    logger.warn('Aktiv akkauntlar yo\'q!');
    return { leftGroups: 0, keptGroups: 0 };
  }

  logger.info(`🧹 Telegram'dan dublikat guruhlar tozalanmoqda...`);
  logger.info(`   Akkauntlar: ${accounts.length} ta`);

  // Barcha guruhlarni tracking qilish
  const seenGroups = new Map(); // telegram_id -> account_id (birinchi topgan)
  let totalLeft = 0;
  let totalKept = 0;

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);
      logger.info(`\n📱 ${account.phone}:`);

      // Bu akkauntdagi barcha guruhlar va kanallar
      const dialogs = await client.getDialogs({ limit: 500 });

      let accountLeft = 0;
      let accountKept = 0;

      for (const dialog of dialogs) {
        const entity = dialog.entity;

        // Faqat guruhlar va kanallar
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          const telegramId = entity.id.toString();
          const title = entity.title || 'Nomsiz guruh';

          // Agar bu guruh allaqachon boshqa akkauntda ko'rilgan bo'lsa?
          if (seenGroups.has(telegramId)) {
            // Bu guruhdan chiqamiz (leave)
            const firstAccount = seenGroups.get(telegramId);
            logger.info(`  ❌ LEAVE: ${title} (birinchi: Account ${firstAccount})`);

            try {
              // Kanaldan yoki guruhdan chiqish
              if (entity.className === 'Channel') {
                await client.invoke(
                  new Api.channels.LeaveChannel({
                    channel: entity
                  })
                );
              } else {
                await client.invoke(
                  new Api.messages.DeleteChatUser({
                    chatId: entity.id,
                    userId: 'me'
                  })
                );
              }

              accountLeft++;
              totalLeft++;

              // Delay (flood wait dan qochish)
              await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (leaveError) {
              logger.error(`     Guruhdan chiqishda xato: ${leaveError.message}`);
            }

          } else {
            // Birinchi marta ko'ryapmiz - bu akkauntda qoldiramiz
            seenGroups.set(telegramId, account.id);
            logger.info(`  ✓ KEEP: ${title}`);
            accountKept++;
            totalKept++;
          }
        }
      }

      logger.info(`  📊 ${account.phone}: ${accountKept} saqlandi, ${accountLeft} dan chiqildi`);

      // Akkauntlar orasida delay
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      logger.error(`  ✗ ${account.phone}: xato - ${error.message}`);

      // Flood wait
      if (error.message && error.message.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.match(/\d+/)?.[0] || 60);
        logger.warn(`  ⏸ Flood wait: ${seconds}s - keyingi akkauntga o'tamiz`);
        continue;
      }
    }
  }

  logger.info(`\n✅ Tozalash tugadi:`);
  logger.info(`   Unikal guruhlar (saqlangan): ${totalKept}`);
  logger.info(`   Guruhlardan chiqildi: ${totalLeft}`);

  return {
    uniqueGroups: totalKept,
    leftGroups: totalLeft
  };
}

/**
 * Tozalashdan keyin database'ni yangilash
 */
async function cleanAndRefreshDatabase() {
  logger.info('🔄 1/2: Telegram\'dan dublikat guruhlar tozalanmoqda...');
  const cleanResult = await cleanDuplicateGroupsFromTelegram();

  logger.info('\n🔄 2/2: Database yangilanmoqda...');

  // Database'ni tozalash
  db.prepare('DELETE FROM broadcast_groups').run();
  logger.info('   - Database tozalandi');

  // Guruhlarni qayta yig'ish
  const { fetchGroupsFromAllAccounts } = require('./multiAccountManager');
  await fetchGroupsFromAllAccounts();

  logger.info('\n✅ Jarayon tugadi!');

  // Yangi statistika
  const totalGroups = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups').get();
  const uniqueIds = db.prepare('SELECT COUNT(DISTINCT telegram_id) as count FROM broadcast_groups').get();

  logger.info(`   - Jami guruhlar: ${totalGroups.count}`);
  logger.info(`   - Unikal guruhlar: ${uniqueIds.count}`);
  logger.info(`   - Dublikatlar: ${totalGroups.count - uniqueIds.count}`);

  return {
    telegramCleaned: cleanResult.leftGroups,
    uniqueGroups: cleanResult.uniqueGroups,
    databaseGroups: totalGroups.count
  };
}

module.exports = {
  cleanDuplicateGroupsFromTelegram,
  cleanAndRefreshDatabase
};
