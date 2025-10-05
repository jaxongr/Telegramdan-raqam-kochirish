const logger = require('../utils/logger');
const {
  getAllGroups,
  createBroadcastMessage,
  updateBroadcastStatus,
  addBroadcastLog,
  updateAccountStatus,
  getActiveAccounts,
  canSendToGroup,
  isMessageSentToGroup,
  updateGroupPermission,
  db
} = require('../database/sqlite');
const { sendMessageToGroup } = require('./multiAccountManager');

// Active broadcast sessions
const activeBroadcasts = new Map();

/**
 * SMART BROADCAST - Parallel va tez yuborish
 * Har bir akkaunt o'z guruhlariga parallel yuboradi
 *
 * XAVFSIZLIK:
 * - 10-15 habar/minut: Juda xavfsiz (tavsiya etiladi)
 * - 16-20 habar/minut: O'rtacha xavf
 * - 20+ habar/minut: Yuqori xavf (bloklanish mumkin)
 */
async function smartBroadcast(messageText, messagesPerMinute = 15) {
  // Xavfsizlik tekshiruvi
  if (messagesPerMinute > 25) {
    logger.warn(`⚠️ OGOHLANTIRISH: ${messagesPerMinute} habar/minut juda tez! Bloklanish xavfi yuqori!`);
  }
  try {
    const result = createBroadcastMessage(messageText);
    const messageId = result.lastInsertRowid;

    logger.info(`📢 Smart Broadcast boshlandi: Message ID ${messageId}`);

    // BARCHA guruhlarni olish (har bir akkaunt har bir guruhda bo'lishi mumkin)
    const groups = getAllGroups();
    const accounts = getActiveAccounts();

    if (groups.length === 0) {
      logger.warn('Guruhlar yo\'q!');
      updateBroadcastStatus(messageId, 'completed', 0, 0);
      return { messageId, status: 'completed', totalGroups: 0 };
    }

    logger.info(`📊 Jami: ${groups.length} guruh, ${accounts.length} akkaunt`);

    // Har bir guruh uchun faqat BITTA akkaunt tayinlangan
    // Boshqa akkauntlar ham guruhda bo'lishi mumkin, lekin habar FAQAT bitta akkauntdan yuboriladi
    const accountGroups = new Map();

    for (const group of groups) {
      if (!group.assigned_account_id) {
        logger.warn(`  ⚠️ Guruh tayinlanmagan: ${group.title}`);
        continue;
      }

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
      skippedCount: 0,
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

  logger.info(`✅ Broadcast tugadi: ${session.sentCount} yuborildi, ${session.failedCount} xato, ${session.skippedCount} skip`);
}

/**
 * Habar matnini ozgina o'zgartirish (spam detection dan qochish)
 */
function addRandomVariation(text) {
  // Oxiriga invisible space yoki minimal o'zgarish
  const variations = [
    text, // Original
    text + '\u200B', // Zero-width space
    text + ' ', // Regular space
    text + '\u00A0', // Non-breaking space
  ];

  return variations[Math.floor(Math.random() * variations.length)];
}

/**
 * Bitta akkaunt uchun habarlarni yuborish
 */
async function sendMessagesForAccount(messageId, accountId, groups, messageText, delayMs, session) {
  const account = db.prepare('SELECT * FROM telegram_accounts WHERE id = ?').get(accountId);

  logger.info(`  🚀 ${account.phone}: ${groups.length} guruhga habar yuborilmoqda`);

  let accountSent = 0;
  let accountFailed = 0;
  let accountSkipped = 0;

  for (const group of groups) {
    try {
      // 1. Guruhga allaqachon yuborilganmi tekshirish
      if (isMessageSentToGroup(messageId, group.id)) {
        logger.info(`    ⏭ ${account.phone}: [Skip - Allaqachon yuborilgan] ${group.title}`);
        session.skippedCount++;
        accountSkipped++;
        continue;
      }

      // 2. Guruhga yozish ruxsati bormi tekshirish
      const permissionCheck = canSendToGroup(group.id);

      if (!permissionCheck.canSend) {
        // Agar SlowMode bo'lsa - kelajakda qayta urinish uchun skip
        if (permissionCheck.reason === 'SlowMode') {
          logger.info(`    ⏱ ${account.phone}: [SlowMode - ${permissionCheck.waitUntil}] ${group.title}`);
          addBroadcastLog(messageId, group.id, accountId, 'skipped', 'SlowMode');
        } else {
          // Agar yozish taqiqlangan bo'lsa - butunlay skip
          logger.info(`    🚫 ${account.phone}: [${permissionCheck.reason}] ${group.title}`);
          addBroadcastLog(messageId, group.id, accountId, 'skipped', permissionCheck.reason);
        }

        session.skippedCount++;
        accountSkipped++;
        continue;
      }

      // 3. Habar matnini ozgina o'zgartirish (har safar boshqacha bo'ladi)
      const variedText = addRandomVariation(messageText);

      // 4. Habar yuborish
      const result = await sendMessageToGroup(accountId, group.telegram_id, variedText);

      if (result.success) {
        session.sentCount++;
        accountSent++;
        addBroadcastLog(messageId, group.id, accountId, 'sent', null);

        // Guruh va akkaunt statistikasini yangilash
        db.prepare('UPDATE broadcast_groups SET last_broadcast_time = CURRENT_TIMESTAMP, total_broadcasts = total_broadcasts + 1 WHERE id = ?').run(group.id);
        db.prepare('UPDATE telegram_accounts SET total_messages_sent = total_messages_sent + 1, last_message_time = CURRENT_TIMESTAMP WHERE id = ?').run(accountId);

        logger.info(`    ✓ ${account.phone}: [${accountSent}/${groups.length}] ${group.title}`);

      } else {
        // Xatolarni aniqlash va tegishli amallarni bajarish

        // ENTITY_NOT_FOUND - guruh topilmadi (chiqib ketilgan yoki o'chirilgan)
        if (result.error === 'ENTITY_NOT_FOUND') {
          updateGroupPermission(group.id, 'denied', 'Guruh topilmadi (chiqib ketilgan/o\'chirilgan)');
          logger.warn(`    ⚠️ ${account.phone}: Guruh topilmadi - ${group.title}`);
          addBroadcastLog(messageId, group.id, accountId, 'skipped', 'ENTITY_NOT_FOUND');
          session.skippedCount++;
          accountSkipped++;
          continue;
        }

        // CHAT_WRITE_FORBIDDEN - yozish taqiqlangan
        if (result.error === 'CHAT_WRITE_FORBIDDEN' || result.error === 'USER_BANNED') {
          updateGroupPermission(group.id, 'denied', result.error);
          logger.warn(`    🚫 ${account.phone}: Yozish taqiqlangan - ${group.title}`);
          addBroadcastLog(messageId, group.id, accountId, 'skipped', result.error);
          session.skippedCount++;
          accountSkipped++;
          continue;
        }

        // SLOWMODE_WAIT - SlowMode
        if (result.error.startsWith('SLOWMODE_WAIT')) {
          const waitSeconds = parseInt(result.error.split('_')[2] || 60);
          const slowmodeUntil = new Date(Date.now() + waitSeconds * 1000).toISOString();
          updateGroupPermission(group.id, 'allowed', null, slowmodeUntil);
          logger.warn(`    ⏱ ${account.phone}: SlowMode ${waitSeconds}s - ${group.title}`);
          addBroadcastLog(messageId, group.id, accountId, 'skipped', `SlowMode ${waitSeconds}s`);
          session.skippedCount++;
          accountSkipped++;
          continue;
        }

        // FLOOD_WAIT - akkaunt flood qilingan
        if (result.error === 'FLOOD_WAIT') {
          const waitUntil = new Date(Date.now() + result.waitSeconds * 1000).toISOString();
          updateAccountStatus(accountId, 'flood_wait', waitUntil);
          logger.warn(`    ⏸ ${account.phone}: Flood wait ${result.waitSeconds}s - to'xtatildi`);
          break; // Bu akkaunt uchun to'xtatamiz
        }

        // Boshqa xatolar
        session.failedCount++;
        accountFailed++;
        addBroadcastLog(messageId, group.id, accountId, 'failed', result.error);
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

  logger.info(`  ✅ ${account.phone}: Tugadi (${accountSent} yuborildi, ${accountFailed} xato, ${accountSkipped} skip)`);
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
    skippedCount: session.skippedCount,
    progress: Math.round(((session.sentCount + session.skippedCount) / session.totalGroups) * 100)
  };
}

module.exports = {
  smartBroadcast,
  getBroadcastProgress
};
