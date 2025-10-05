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
  getUnassignedGroups
} = require('../database/sqlite');

// Active client connections
const activeClients = new Map();

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
  const allGroups = [];

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);

      // Barcha dialoglarni olish
      const dialogs = await client.getDialogs({ limit: 500 });

      let accountGroups = 0;

      for (const dialog of dialogs) {
        const entity = dialog.entity;

        // Faqat guruhlar va kanallar
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          const telegramId = entity.id.toString();
          const title = entity.title || 'Nomsiz guruh';
          const username = entity.username || null;

          // Database ga saqlash
          upsertBroadcastGroup(telegramId, title, username);

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

      logger.info(`  ✓ ${account.phone}: ${accountGroups} guruh topildi`);

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

  logger.info(`✅ Jami ${totalGroups} guruh topildi va saqlandi`);
  return allGroups;
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
  autoAssignGroupsToAccounts,
  rebalanceGroups,
  sendMessageToGroup,
  disconnectAllClients,
  getAccountInfo
};
