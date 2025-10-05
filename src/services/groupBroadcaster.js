const logger = require('../utils/logger');
const {
  getAllGroups,
  createBroadcastMessage,
  updateBroadcastStatus,
  addBroadcastLog,
  updateAccountStatus,
  db
} = require('../database/sqlite');
const { sendMessageToGroup } = require('./multiAccountManager');

// Active broadcast sessions
const activeBroadcasts = new Map();

/**
 * Habarni barcha guruhlarga yuborish
 */
async function broadcastMessage(messageText, delaySeconds = 5) {
  try {
    // Broadcast message yaratish
    const result = createBroadcastMessage(messageText);
    const messageId = result.lastInsertRowid;

    logger.info(`📢 Broadcast boshlandi: Message ID ${messageId}`);

    // Barcha guruhlarni olish
    const groups = getAllGroups();
    const totalGroups = groups.length;

    if (totalGroups === 0) {
      logger.warn('Guruhlar yo\'q!');
      updateBroadcastStatus(messageId, 'completed', 0, 0);
      return {
        messageId,
        status: 'completed',
        totalGroups: 0,
        sentCount: 0,
        failedCount: 0
      };
    }

    // Broadcast session yaratish
    activeBroadcasts.set(messageId, {
      messageId,
      totalGroups,
      sentCount: 0,
      failedCount: 0,
      status: 'sending',
      startedAt: new Date()
    });

    // Statusni yangilash
    updateBroadcastStatus(messageId, 'sending', 0, 0);
    db.prepare('UPDATE broadcast_messages SET total_groups = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(totalGroups, messageId);

    // Background da yuborish
    sendBroadcastInBackground(messageId, messageText, groups, delaySeconds);

    return {
      messageId,
      status: 'sending',
      totalGroups,
      sentCount: 0,
      failedCount: 0
    };

  } catch (error) {
    logger.error('Broadcast boshlashda xato:', error);
    throw error;
  }
}

/**
 * Background da habarlarni yuborish
 */
async function sendBroadcastInBackground(messageId, messageText, groups, delaySeconds) {
  const session = activeBroadcasts.get(messageId);

  for (const group of groups) {
    // Agar guruhga akkaunt tayinlanmagan bo'lsa
    if (!group.assigned_account_id) {
      logger.warn(`Guruh ${group.title} ga akkaunt tayinlanmagan`);
      session.failedCount++;
      addBroadcastLog(messageId, group.id, null, 'failed', 'No account assigned');
      continue;
    }

    try {
      // Habar yuborish
      const result = await sendMessageToGroup(
        group.assigned_account_id,
        group.telegram_id,
        messageText
      );

      if (result.success) {
        session.sentCount++;
        addBroadcastLog(messageId, group.id, group.assigned_account_id, 'success', null);

        // Guruh statistikasini yangilash
        db.prepare(`
          UPDATE broadcast_groups
          SET last_broadcast_time = CURRENT_TIMESTAMP,
              total_broadcasts = total_broadcasts + 1
          WHERE id = ?
        `).run(group.id);

        // Akkaunt statistikasini yangilash
        db.prepare(`
          UPDATE telegram_accounts
          SET total_messages_sent = total_messages_sent + 1,
              last_message_time = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(group.assigned_account_id);

        logger.info(`  ✓ [${session.sentCount}/${session.totalGroups}] ${group.title}`);

      } else {
        session.failedCount++;
        addBroadcastLog(messageId, group.id, group.assigned_account_id, 'failed', result.error);

        // Flood wait bo'lsa
        if (result.error === 'flood_wait') {
          const waitUntil = new Date(Date.now() + result.waitSeconds * 1000).toISOString();
          updateAccountStatus(group.assigned_account_id, 'flood_wait', waitUntil);
          logger.warn(`  ⏸ Flood wait: ${result.waitSeconds}s`);
        }

        logger.warn(`  ✗ [${session.sentCount}/${session.totalGroups}] ${group.title}: ${result.error}`);
      }

    } catch (error) {
      session.failedCount++;
      addBroadcastLog(messageId, group.id, group.assigned_account_id, 'failed', error.message);
      logger.error(`  ✗ Xato: ${group.title}`, error);
    }

    // Delay
    await sleep(delaySeconds * 1000);

    // Statusni yangilash (har 10 habardan keyin)
    if ((session.sentCount + session.failedCount) % 10 === 0) {
      updateBroadcastStatus(messageId, 'sending', session.sentCount, session.failedCount);
    }
  }

  // Broadcast tugadi
  session.status = 'completed';
  session.completedAt = new Date();

  updateBroadcastStatus(messageId, 'completed', session.sentCount, session.failedCount);
  db.prepare('UPDATE broadcast_messages SET completed_at = CURRENT_TIMESTAMP WHERE id = ?').run(messageId);

  logger.info(`✅ Broadcast tugadi: ${session.sentCount} muvaffaqiyatli, ${session.failedCount} xato`);
}

/**
 * Broadcast statusini olish
 */
function getBroadcastStatus(messageId) {
  const session = activeBroadcasts.get(messageId);

  if (!session) {
    // Database dan olish
    const message = db.prepare('SELECT * FROM broadcast_messages WHERE id = ?').get(messageId);

    if (!message) {
      return null;
    }

    return {
      messageId: message.id,
      status: message.status,
      totalGroups: message.total_groups,
      sentCount: message.sent_count,
      failedCount: message.failed_count,
      messageText: message.message_text,
      startedAt: message.started_at,
      completedAt: message.completed_at
    };
  }

  return {
    messageId: session.messageId,
    status: session.status,
    totalGroups: session.totalGroups,
    sentCount: session.sentCount,
    failedCount: session.failedCount,
    startedAt: session.startedAt,
    completedAt: session.completedAt
  };
}

/**
 * Barcha broadcast habarlarni olish
 */
function getAllBroadcasts(limit = 50) {
  const messages = db.prepare(`
    SELECT * FROM broadcast_messages
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return messages;
}

/**
 * Broadcast loglarini olish
 */
function getBroadcastLogs(messageId, limit = 100) {
  const logs = db.prepare(`
    SELECT
      bl.*,
      bg.title as group_title,
      bg.telegram_id as group_telegram_id,
      ta.phone as account_phone
    FROM broadcast_logs bl
    LEFT JOIN broadcast_groups bg ON bl.group_id = bg.id
    LEFT JOIN telegram_accounts ta ON bl.account_id = ta.id
    WHERE bl.message_id = ?
    ORDER BY bl.sent_at DESC
    LIMIT ?
  `).all(messageId, limit);

  return logs;
}

/**
 * Broadcast ni bekor qilish
 */
function cancelBroadcast(messageId) {
  const session = activeBroadcasts.get(messageId);

  if (session && session.status === 'sending') {
    session.status = 'cancelled';
    updateBroadcastStatus(messageId, 'cancelled', session.sentCount, session.failedCount);
    activeBroadcasts.delete(messageId);

    logger.info(`🚫 Broadcast bekor qilindi: ${messageId}`);
    return true;
  }

  return false;
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  broadcastMessage,
  getBroadcastStatus,
  getAllBroadcasts,
  getBroadcastLogs,
  cancelBroadcast
};
