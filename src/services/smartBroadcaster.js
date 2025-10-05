const logger = require('../utils/logger');
const {
  getAllGroups,
  createBroadcastMessage,
  updateBroadcastStatus,
  addBroadcastLog,
  updateAccountStatus,
  getActiveAccounts,
  db
} = require('../database/sqlite');
const { sendMessageToGroup } = require('./multiAccountManager');

// Active broadcast sessions
const activeBroadcasts = new Map();

/**
 * SMART BROADCAST - Parallel va tez yuborish
 * Har bir akkaunt o'z guruhlariga parallel yuboradi
 */
async function smartBroadcast(messageText, messagesPerMinute = 15) {
  try {
    const result = createBroadcastMessage(messageText);
    const messageId = result.lastInsertRowid;

    logger.info(`📢 Smart Broadcast boshlandi: Message ID ${messageId}`);

    // Guruhlarni akkaunt bo'yicha guruhlash
    const groups = getAllGroups();
    const accounts = getActiveAccounts();

    if (groups.length === 0) {
      logger.warn('Guruhlar yo\'q!');
      updateBroadcastStatus(messageId, 'completed', 0, 0);
      return { messageId, status: 'completed', totalGroups: 0 };
    }

    // Har bir akkaunt uchun guruhlarni ajratish
    const accountGroups = new Map();

    for (const group of groups) {
      if (!group.assigned_account_id) continue;

      if (!accountGroups.has(group.assigned_account_id)) {
        accountGroups.set(group.assigned_account_id, []);
      }
      accountGroups.get(group.assigned_account_id).push(group);
    }

    // Session yaratish
    activeBroadcasts.set(messageId, {
      messageId,
      totalGroups: groups.length,
      sentCount: 0,
      failedCount: 0,
      status: 'sending',
      startedAt: new Date()
    });

    // Update status
    updateBroadcastStatus(messageId, 'sending', 0, 0);

    // Background'da parallel yuborish
    sendSmartBroadcastInBackground(messageId, messageText, accountGroups, messagesPerMinute);

    return {
      messageId,
      status: 'sending',
      totalGroups: groups.length,
      totalAccounts: accountGroups.size
    };

  } catch (error) {
    logger.error('Smart Broadcast xato:', error);
    throw error;
  }
}

/**
 * Background'da parallel yuborish - har bir akkaunt parallel ishlaydi
 */
async function sendSmartBroadcastInBackground(messageId, messageText, accountGroups, messagesPerMinute) {
  const session = activeBroadcasts.get(messageId);

  // Har bir minutda nechta habar yuborishni hisoblash
  const delayMs = Math.floor((60 * 1000) / messagesPerMinute);

  logger.info(`⚡ Parallel yuborish: ${accountGroups.size} akkaunt, ${messagesPerMinute} habar/minut, ${delayMs}ms delay`);

  // Har bir akkaunt uchun parallel task yaratish
  const accountTasks = [];

  for (const [accountId, groups] of accountGroups.entries()) {
    const task = sendMessagesForAccount(
      messageId,
      accountId,
      groups,
      messageText,
      delayMs,
      session
    );
    accountTasks.push(task);
  }

  // Barcha akkauntlar parallel ishlaydi
  await Promise.allSettled(accountTasks);

  // Broadcast tugadi
  session.status = 'completed';
  updateBroadcastStatus(messageId, 'completed', session.sentCount, session.failedCount);

  logger.info(`✅ Broadcast tugadi: ${session.sentCount} yuborildi, ${session.failedCount} xato`);
}

/**
 * Bitta akkaunt uchun habarlarni yuborish
 */
async function sendMessagesForAccount(messageId, accountId, groups, messageText, delayMs, session) {
  const account = db.prepare('SELECT * FROM telegram_accounts WHERE id = ?').get(accountId);

  logger.info(`  🚀 ${account.phone}: ${groups.length} guruhga habar yuborilmoqda`);

  let accountSent = 0;
  let accountFailed = 0;

  for (const group of groups) {
    try {
      // Habar yuborish
      const result = await sendMessageToGroup(accountId, group.telegram_id, messageText);

      if (result.success) {
        session.sentCount++;
        accountSent++;
        addBroadcastLog(messageId, group.id, accountId, 'success', null);

        // Guruh va akkaunt statistikasini yangilash
        db.prepare('UPDATE broadcast_groups SET last_broadcast_time = CURRENT_TIMESTAMP, total_broadcasts = total_broadcasts + 1 WHERE id = ?').run(group.id);
        db.prepare('UPDATE telegram_accounts SET total_messages_sent = total_messages_sent + 1, last_message_time = CURRENT_TIMESTAMP WHERE id = ?').run(accountId);

        logger.info(`    ✓ ${account.phone}: [${accountSent}/${groups.length}] ${group.title}`);

      } else {
        session.failedCount++;
        accountFailed++;
        addBroadcastLog(messageId, group.id, accountId, 'failed', result.error);

        // Flood wait
        if (result.error === 'flood_wait') {
          const waitUntil = new Date(Date.now() + result.waitSeconds * 1000).toISOString();
          updateAccountStatus(accountId, 'flood_wait', waitUntil);
          logger.warn(`    ⏸ ${account.phone}: Flood wait ${result.waitSeconds}s - to'xtatildi`);
          break; // Bu akkaunt uchun to'xtatamiz
        }

        logger.warn(`    ✗ ${account.phone}: ${group.title} - ${result.error}`);
      }

    } catch (error) {
      session.failedCount++;
      accountFailed++;
      addBroadcastLog(messageId, group.id, accountId, 'failed', error.message);
      logger.error(`    ✗ ${account.phone}: ${group.title}`, error);
    }

    // Delay - tezlikni nazorat qilish
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  logger.info(`  ✅ ${account.phone}: Tugadi (${accountSent} yuborildi, ${accountFailed} xato)`);
}

/**
 * Broadcast statusini olish
 */
function getBroadcastProgress(messageId) {
  const session = activeBroadcasts.get(messageId);

  if (!session) {
    const message = db.prepare('SELECT * FROM broadcast_messages WHERE id = ?').get(messageId);
    if (message) {
      return {
        messageId,
        status: message.status,
        totalGroups: message.total_groups,
        sentCount: message.sent_count,
        failedCount: message.failed_count
      };
    }
    return null;
  }

  return {
    messageId: session.messageId,
    status: session.status,
    totalGroups: session.totalGroups,
    sentCount: session.sentCount,
    failedCount: session.failedCount,
    progress: Math.round((session.sentCount / session.totalGroups) * 100)
  };
}

module.exports = {
  smartBroadcast,
  getBroadcastProgress
};
