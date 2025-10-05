const logger = require('../utils/logger');

/**
 * Guruhga avtomatik xabar yuborish tizimi
 */

let scheduledMessages = [];
let intervals = new Map();

/**
 * Guruhga xabar yuborish
 */
async function sendMessageToGroup(telegramClient, groupId, message) {
  try {
    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    // Guruhga xabar yuborish
    await telegramClient.sendMessage(groupId, { message });

    logger.info(`✅ Xabar yuborildi: ${groupId}`);
    return { success: true };
  } catch (error) {
    logger.error(`❌ Xabar yuborishda xato: ${groupId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Jadvalga xabar qo'shish
 * @param {string} groupId - Guruh ID (-100... formatda)
 * @param {string} message - Yuborilishi kerak bo'lgan xabar
 * @param {number} intervalMinutes - Har necha daqiqada yuborish (masalan: 60 = har soat)
 */
function scheduleMessage(telegramClient, groupId, message, intervalMinutes) {
  // Agar allaqachon jadval bo'lsa, to'xtatish
  if (intervals.has(groupId)) {
    stopScheduledMessage(groupId);
  }

  const intervalMs = intervalMinutes * 60 * 1000;

  // Darhol birinchi xabarni yuborish
  sendMessageToGroup(telegramClient, groupId, message);

  // Interval o'rnatish
  const interval = setInterval(() => {
    sendMessageToGroup(telegramClient, groupId, message);
  }, intervalMs);

  intervals.set(groupId, interval);
  scheduledMessages.push({ groupId, message, intervalMinutes });

  logger.info(`📅 Jadval o'rnatildi: ${groupId} (har ${intervalMinutes} daqiqada)`);

  return { success: true };
}

/**
 * Jadval xabarni to'xtatish
 */
function stopScheduledMessage(groupId) {
  if (intervals.has(groupId)) {
    clearInterval(intervals.get(groupId));
    intervals.delete(groupId);
    scheduledMessages = scheduledMessages.filter(m => m.groupId !== groupId);

    logger.info(`⏹ Jadval to'xtatildi: ${groupId}`);
    return { success: true };
  }
  return { success: false, error: 'Jadval topilmadi' };
}

/**
 * Barcha jadvallarni olish
 */
function getScheduledMessages() {
  return scheduledMessages;
}

/**
 * Barcha jadvallarni tozalash
 */
function clearAllSchedules() {
  intervals.forEach((interval, groupId) => {
    clearInterval(interval);
  });
  intervals.clear();
  scheduledMessages = [];
  logger.info('🗑 Barcha jadvallar tozalandi');
}

module.exports = {
  sendMessageToGroup,
  scheduleMessage,
  stopScheduledMessage,
  getScheduledMessages,
  clearAllSchedules
};
