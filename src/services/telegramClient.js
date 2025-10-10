const { TelegramClient } = require('telegram');
const { Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const { extractPhones } = require('./phoneExtractor');
const { getActiveGroups, savePhone, getGroupByTelegramId } = require('../database/models');
const logger = require('../utils/logger');

let client = null;
let isMonitoring = false;
let sessionString = '';

/**
 * Telegram client'ni ishga tushirish
 */
async function startTelegramClient(apiId, apiHash, phone, session = '') {
  try {
    sessionString = session;
    const stringSession = new StringSession(sessionString);

    client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    await client.start({
      phoneNumber: async () => phone,
      password: async () => await input.text('Parol (2FA): '),
      phoneCode: async () => await input.text('Telegram kodini kiriting: '),
      onError: (err) => logger.error('Telegram xatosi:', err),
    });

    // Session'ni saqlash
    sessionString = client.session.save();
    logger.info('✓ Telegram client ulandi');
    logger.info('Session (to\'liq): ' + sessionString);

    return { success: true, session: sessionString };
  } catch (error) {
    logger.error('Telegram client xatosi:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Monitoring'ni boshlash
 */
async function startMonitoring() {
  if (!client || !client.connected) {
    throw new Error('Telegram client ulanmagan!');
  }

  if (isMonitoring) {
    logger.warn('Monitoring allaqachon ishlayapti');
    return;
  }

  isMonitoring = true;
  logger.info('📡 Monitoring boshlandi...');

  // Faol guruhlarni olish (try-catch bilan)
  let activeGroups = [];
  let groupFetchError = null;

  try {
    logger.info('🔍 Faol guruhlar olinmoqda...');
    activeGroups = await getActiveGroups();
    logger.info(`✅ ${activeGroups.length} ta guruh topildi`);
    logger.info(`Monitoring: ${activeGroups.length} ta guruh`);
  } catch (error) {
    groupFetchError = error;
    logger.error('❌ Faol guruhlarni olishda xato:', error.message);
    logger.warn('⚠️ Guruhlar olinmadi, lekin event handler qo\'shilmoqda (yangi xabarlar ushlanadi)');
  }

  // Yangi xabarlarni tinglash
  const { NewMessage } = require('telegram/events');

  // Event handler ALBATTA qo'shiladi (guruh fetch xatosi bo'lsa ham)
  try {
    client.addEventHandler(async (event) => {
      try {
        if (!isMonitoring) return;

        const message = event.message;
        if (!message || !message.text) return;

        // Qaysi guruhdan kelganini aniqlash
        const chatId = message.peerId?.channelId?.toString()
          || message.peerId?.chatId?.toString()
          || message.chatId?.toString();

        if (!chatId) return;

        // Telegram ID ni to'g'ri formatga keltirish (-100 prefixi bilan)
        const telegramId = chatId.startsWith('-') ? chatId : `-100${chatId}`;

        logger.info(`📨 Xabar keldi: ${telegramId} - "${message.text.substring(0, 50)}..."`);

        // Guruhni topish
        const group = await getGroupByTelegramId(telegramId);
        if (!group || !group.active) return;

        // Kalit so'zlarni tekshirish
        const messageText = message.text.toLowerCase();
        const keywords = group.keywords ? group.keywords.split(',').map(k => k.trim()).filter(k => k) : [];

        // Faqat kalit so'zlar bo'lsa tekshirish
        if (keywords.length > 0) {
          let hasKeyword = false;
          for (const keyword of keywords) {
            if (messageText.includes(keyword.toLowerCase())) {
              hasKeyword = true;
              break;
            }
          }
          if (!hasKeyword) return;
        }

        // Telefon raqamlarni topish
        const phones = extractPhones(message.text);

        if (phones.length > 0) {
          logger.info(`📞 ${phones.length} ta raqam topildi: ${group.name} [ID: ${group.id}, TG: ${telegramId}] (${message.text.substring(0, 50)}...)`);

          for (const phone of phones) {
            await savePhone(phone, group.id, message.text);
            logger.info(`  ✓ Saqlandi: ${phone}`);

            // SMS yuborish (faqat sms_enabled guruhlarga)
            if (group.sms_enabled) {
              try {
                const { sendSMS } = require('./smsService');
                const smsText = group.sms_template || 'Assalomu alaykum! Sizning e\'loningiz ko\'rildi.';

                // Template variables tayyorlash
                const templateVars = {
                  phone: phone,
                  group: group.name,
                  name: message.sender?.firstName || '',
                  foundAt: new Date()
                };

                const result = await sendSMS(phone, group.id, smsText, templateVars);
                if (result.success) {
                  logger.info(`  📤 SMS yuborildi: ${phone}`);
                } else {
                  logger.warn(`  ❌ SMS yuborilmadi: ${phone} (${result.error})`);
                }
              } catch (smsError) {
                logger.error(`  ❌ SMS xatosi: ${phone}`, smsError);
              }
            }
          }
        }

        // YANGI: Logistics bot'ga yuborish (faqat kalit so'zlar bor guruhlarga)
        if (keywords.length > 0 && phones.length > 0) {
          try {
            const { processNewMessage } = require('./logisticsBot');
            await processNewMessage(event.message, parseInt(chatId), group.name);
          } catch (logError) {
            logger.error('Logistics bot xatosi:', logError);
          }
        }

      } catch (error) {
        logger.error('Xabar qayta ishlashda xato:', error);
      }
    }, new NewMessage({}));

    logger.info('✓ Event listener qo\'shildi');

    // Yakuniy hisobot
    if (groupFetchError) {
      logger.warn(`⚠️ OGOHLANTIRISH: Guruhlarni olishda muammo bo'ldi, lekin monitoring ishlaydi`);
      logger.warn(`   Xato: ${groupFetchError.message}`);
    } else {
      logger.info(`✅ MUVAFFAQIYATLI: ${activeGroups.length} ta guruh monitoring ostida`);
    }
  } catch (handlerError) {
    logger.error('❌ JIDDIY XATO: Event handler qo\'shilmadi!', handlerError);
    isMonitoring = false;
    throw handlerError;
  }
}

/**
 * Monitoring'ni to'xtatish
 */
async function stopMonitoring() {
  isMonitoring = false;
  logger.info('⏸ Monitoring to\'xtatildi');
}

/**
 * Client'ni uzish
 */
async function disconnectClient() {
  if (client) {
    await client.disconnect();
    client = null;
    isMonitoring = false;
    logger.info('Telegram client uzildi');
  }
}

/**
 * Guruhga qo'shilish
 */
async function joinGroup(inviteLink) {
  if (!client || !client.connected) {
    throw new Error('Telegram client ulanmagan!');
  }

  try {
    const result = await client.invoke(
      new Api.messages.ImportChatInvite({ hash: inviteLink.split('/').pop() })
    );
    logger.info('✓ Guruhga qo\'shildi:', inviteLink);
    return { success: true, result };
  } catch (error) {
    logger.error('Guruhga qo\'shilish xatosi:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Barcha dialoglarni olish (guruhlar va kanallar)
 */
async function getDialogs() {
  if (!client || !client.connected) {
    throw new Error('Telegram client ulanmagan!');
  }

  try {
    const dialogs = await client.getDialogs({ limit: 100 });

    const result = dialogs
      .filter(d => d.isGroup || d.isChannel)
      .map(d => {
        // Telegram ID ni to'g'ri olish
        let telegramId = '';
        if (d.id) {
          telegramId = d.id.toString();
        } else if (d.entity && d.entity.id) {
          telegramId = d.entity.id.toString();
        }

        // -100 prefixi qo'shish (agar kanal yoki supergroup bo'lsa)
        if (d.isChannel && !telegramId.startsWith('-')) {
          telegramId = '-100' + telegramId;
        } else if (!telegramId.startsWith('-')) {
          telegramId = '-' + telegramId;
        }

        return {
          id: telegramId,
          name: d.title || d.name || 'No name',
          isGroup: d.isGroup,
          isChannel: d.isChannel
        };
      });

    logger.info(`✓ ${result.length} ta guruh/kanal topildi`);
    return result;
  } catch (error) {
    logger.error('Dialoglarni olishda xato:', error);
    throw error;
  }
}

/**
 * Client statusini olish
 */
function getClientStatus() {
  return {
    connected: client ? client.connected : false,
    monitoring: isMonitoring,
    session: sessionString ? sessionString.substring(0, 50) + '...' : null
  };
}

/**
 * Session'ni olish
 */
function getSession() {
  return sessionString;
}

/**
 * Client obyektini olish (history scraper uchun)
 */
function getClient() {
  return client;
}

module.exports = {
  startTelegramClient,
  startMonitoring,
  stopMonitoring,
  disconnectClient,
  joinGroup,
  getDialogs,
  getClientStatus,
  getSession,
  getClient
};
