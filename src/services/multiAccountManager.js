const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const logger = require('../utils/logger');
const {
  getActiveAccounts,
  getAccountById,
  updateAccountStatus,
  upsertBroadcastGroup,
  assignGroupToAccount,
  getUnassignedGroups,
  db
} = require('../database/sqlite');

// Active client connections
const activeClients = new Map();

// Client creation locks (prevent duplicate connections)
const clientLocks = new Map();

/**
 * Akkaunt uchun Telegram client yaratish
 */
async function createClientForAccount(account) {
  try {
    const session = new StringSession(account.session_string);

    const client = new TelegramClient(
      session,
      parseInt(account.api_id),
      account.api_hash,
      {
        connectionRetries: 5,
      }
    );

    await client.connect();
    logger.info(`✓ Client ulandi: ${account.phone}`);

    activeClients.set(account.id, client);
    return client;

  } catch (error) {
    logger.error(`Akkaunt ${account.phone} ga ulanishda xato:`, error);

    // Agar session invalid bo'lsa
    if (error.message.includes('AUTH_KEY')) {
      await updateAccountStatus(account.id, 'invalid_session');
    }

    throw error;
  }
}

/**
 * Akkauntning clientini olish (yoki yaratish)
 */
async function getClient(accountId) {
  // Agar client allaqachon bor bo'lsa
  if (activeClients.has(accountId)) {
    return activeClients.get(accountId);
  }

  // Yangi client yaratish
  const account = getAccountById(accountId);
  if (!account) {
    throw new Error(`Akkaunt topilmadi: ${accountId}`);
  }

  return await createClientForAccount(account);
}

/**
 * Barcha akkauntlardan guruhlarni yig'ish
 */
async function fetchGroupsFromAllAccounts() {
  const accounts = getActiveAccounts();
  logger.info(`📥 ${accounts.length} ta akkauntdan guruhlar yig'ilyapti...`);

  let totalGroups = 0;
  let newGroups = 0;
  const allGroups = [];

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);

      // Barcha dialoglarni olish
      const dialogs = await client.getDialogs({ limit: 500 });

      let accountGroups = 0;
      let accountNewGroups = 0;

      for (const dialog of dialogs) {
        const entity = dialog.entity;

        // Faqat guruhlar va kanallar
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          const telegramId = entity.id.toString();
          const title = entity.title || 'Nomsiz guruh';
          const username = entity.username || null;

          // Guruh allaqachon boshqa akkauntga biriktirilganmi tekshirish
          const existingGroup = db.prepare('SELECT * FROM broadcast_groups WHERE telegram_id = ?').get(telegramId);

          if (existingGroup) {
            // Guruh mavjud - faqat ma'lumotlarni yangilash
            upsertBroadcastGroup(telegramId, title, username);

            // Agar bu guruh hali hech kimga tayinlanmagan bo'lsa, bu akkauntga tayinlash
            if (!existingGroup.assigned_account_id) {
              assignGroupToAccount(existingGroup.id, account.id);
              accountNewGroups++;
              newGroups++;
              logger.info(`    → ${title} guruh ${account.phone} ga tayinlandi`);
            }
          } else {
            // Yangi guruh - qo'shish va avtomatik tayinlash
            upsertBroadcastGroup(telegramId, title, username);
            const group = db.prepare('SELECT * FROM broadcast_groups WHERE telegram_id = ?').get(telegramId);
            assignGroupToAccount(group.id, account.id);
            accountNewGroups++;
            newGroups++;
            logger.info(`    + ${title} guruh qo'shildi va ${account.phone} ga tayinlandi`);
          }

          allGroups.push({
            telegram_id: telegramId,
            title,
            username,
            account_phone: account.phone
          });

          accountGroups++;
          totalGroups++;
        }
      }

      logger.info(`  ✓ ${account.phone}: ${accountGroups} guruh topildi (${accountNewGroups} yangi)`);


    } catch (error) {
      logger.error(`  ✗ ${account.phone}: xato - ${error.message}`);

      // Flood wait
      if (error.message.includes('FLOOD_WAIT')) {
        const seconds = parseInt(error.message.match(/\d+/)?.[0] || 60);
        const waitUntil = new Date(Date.now() + seconds * 1000).toISOString();
        await updateAccountStatus(account.id, 'flood_wait', waitUntil);
      }
    }
  }

  logger.info(`✅ Jami ${totalGroups} guruh topildi, ${newGroups} yangi guruh tayinlandi`);
  return { total: totalGroups, newAssigned: newGroups };
}

/**
 * Database'da guruhlarni unikallashtiriu - har bir guruh faqat bitta akkauntga tayinlanadi
 */
async function deduplicateAndAssignUniqueGroups() {
  const accounts = getActiveAccounts();

  if (accounts.length === 0) {
    logger.warn('Aktiv akkauntlar yo\'q!');
    return { uniqueGroups: 0, duplicatesRemoved: 0 };
  }

  logger.info(`🔄 Database'da guruhlar unikallashtirilmoqda...`);

  // Avval barcha guruhlarni yig'amiz
  await fetchGroupsFromAllAccounts();

  // Endi database'dagi barcha guruhlarni tekshiramiz
  const allGroups = db.prepare('SELECT telegram_id, COUNT(*) as count FROM broadcast_groups GROUP BY telegram_id').all();

  let uniqueGroups = 0;
  let duplicatesInDB = 0;
  const groupAssignments = new Map(); // telegram_id -> account_id

  // Har bir unikal guruhni bitta akkauntga tayinlash
  for (const groupInfo of allGroups) {
    const telegramId = groupInfo.telegram_id;

    // Bu telegram_id uchun barcha yozuvlarni topish
    const entries = db.prepare('SELECT id, assigned_account_id FROM broadcast_groups WHERE telegram_id = ?').all(telegramId);

    if (entries.length === 1) {
      // Faqat bitta yozuv - unikal
      uniqueGroups++;
    } else {
      // Ko'p yozuv bor - faqat birinchisini saqlaymiz
      const keepEntry = entries[0];
      const removeIds = entries.slice(1).map(e => e.id);

      // Qolganlarini o'chirish
      for (const removeId of removeIds) {
        db.prepare('DELETE FROM broadcast_groups WHERE id = ?').run(removeId);
        duplicatesInDB++;
      }

      uniqueGroups++;
    }
  }

  // Endi tayinlanmagan guruhlarni round-robin bilan taqsimlash
  const unassigned = getUnassignedGroups();
  let currentAccountIndex = 0;
  let assigned = 0;

  for (const group of unassigned) {
    const account = accounts[currentAccountIndex];
    assignGroupToAccount(group.id, account.id);
    assigned++;
    currentAccountIndex = (currentAccountIndex + 1) % accounts.length;
  }

  logger.info(`✅ Unikallashtiuv tugadi:`);
  logger.info(`   - Unikal guruhlar: ${uniqueGroups}`);
  logger.info(`   - Database'dan o'chirilgan dublikatlar: ${duplicatesInDB}`);
  logger.info(`   - Yangi tayinlangan: ${assigned}`);

  return {
    uniqueGroups,
    duplicatesRemoved: duplicatesInDB,
    newlyAssigned: assigned
  };
}

/**
 * Guruhlarni akkauntlarga avtomatik taqsimlash (Load Balancing)
 */
async function autoAssignGroupsToAccounts() {
  const accounts = getActiveAccounts();
  const unassignedGroups = getUnassignedGroups();

  if (accounts.length === 0) {
    logger.warn('Aktiv akkauntlar yo\'q!');
    return { assigned: 0 };
  }

  if (unassignedGroups.length === 0) {
    logger.info('Tayinlanmagan guruhlar yo\'q');
    return { assigned: 0 };
  }

  logger.info(`🔄 ${unassignedGroups.length} guruh ${accounts.length} akkauntga taqsimlanmoqda...`);

  let currentAccountIndex = 0;
  let assignedCount = 0;

  // Round-robin: guruhlarni teng taqsimlash
  for (const group of unassignedGroups) {
    const account = accounts[currentAccountIndex];

    assignGroupToAccount(group.id, account.id);
    assignedCount++;

    // Keyingi akkauntga o'tish
    currentAccountIndex = (currentAccountIndex + 1) % accounts.length;
  }

  logger.info(`✅ ${assignedCount} guruh tayinlandi`);

  // Har bir akkauntga nechta guruh tayinlanganini yangilash
  for (const account of accounts) {
    const { db } = require('../database/sqlite');
    const result = db.prepare('SELECT COUNT(*) as count FROM broadcast_groups WHERE assigned_account_id = ?').get(account.id);

    db.prepare('UPDATE telegram_accounts SET assigned_groups_count = ? WHERE id = ?').run(result.count, account.id);
  }

  return { assigned: assignedCount };
}

/**
 * Guruhlarni qayta taqsimlash (reassign)
 */
async function rebalanceGroups() {
  logger.info('⚖️ Guruhlar qayta taqsimlanmoqda...');

  // Barcha tayinlashlarni bekor qilish
  const { db } = require('../database/sqlite');
  db.prepare('UPDATE broadcast_groups SET assigned_account_id = NULL').run();
  db.prepare('UPDATE telegram_accounts SET assigned_groups_count = 0').run();

  // Qayta taqsimlash
  return await autoAssignGroupsToAccounts();
}

/**
 * Bir guruhga habar yuborish
 */
async function sendMessageToGroup(accountId, groupTelegramId, messageText) {
  try {
    const client = await getClient(accountId);

    // Guruhni topish
    const entity = await client.getEntity(groupTelegramId);

    // Habar yuborish
    await client.sendMessage(entity, { message: messageText });

    logger.info(`✓ Habar yuborildi: ${groupTelegramId}`);
    return { success: true };

  } catch (error) {
    logger.error(`✗ Habar yuborishda xato (${groupTelegramId}):`, error);

    // Flood wait
    if (error.message.includes('FLOOD_WAIT')) {
      const seconds = parseInt(error.message.match(/\d+/)?.[0] || 60);
      return {
        success: false,
        error: 'flood_wait',
        waitSeconds: seconds
      };
    }

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Barcha clientlarni disconnect qilish
 */
async function disconnectAllClients() {
  logger.info('🔌 Barcha clientlar disconnect qilinyapti...');

  for (const [accountId, client] of activeClients.entries()) {
    try {
      await client.disconnect();
      logger.info(`  ✓ Disconnect: Account ${accountId}`);
    } catch (error) {
      logger.error(`  ✗ Disconnect xatosi: Account ${accountId}`, error);
    }
  }

  activeClients.clear();
  logger.info('✅ Barcha clientlar disconnect qilindi');
}

/**
 * Akkaunt haqida ma'lumot olish
 */
async function getAccountInfo(accountId) {
  try {
    const client = await getClient(accountId);
    const me = await client.getMe();

    return {
      id: me.id.toString(),
      phone: me.phone,
      username: me.username,
      firstName: me.firstName,
      lastName: me.lastName
    };
  } catch (error) {
    logger.error('Akkaunt ma\'lumotini olishda xato:', error);
    return null;
  }
}

module.exports = {
  createClientForAccount,
  getClient,
  fetchGroupsFromAllAccounts,
  deduplicateAndAssignUniqueGroups,
  autoAssignGroupsToAccounts,
  rebalanceGroups,
  sendMessageToGroup,
  disconnectAllClients,
  getAccountInfo
};
