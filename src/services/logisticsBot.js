const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');
const {
  initLogisticsDatabase,
  addOrUpdateYukchiPhone,
  addOrUpdateDispecherPhone,
  saveAnnouncement,
  markPhoneTaken,
  isPhoneTaken,
  saveUserClassification,
  saveAdminCorrection,
  addSubscriber,
  getSubscriber,
  updateSubscriberStatus,
  isDuplicate,
  addToDuplicateCache
} = require('../database/logistics');
const { classifyUser, extractPhone, formatAnnouncement } = require('./classifier');
const logger = require('../utils/logger');

// Bot konfiguratsiya
const BOT_TOKEN = process.env.LOGISTICS_BOT_TOKEN;
const TARGET_GROUP_ID = process.env.LOGISTICS_TARGET_GROUP_ID; // Yoldauz | Rasmiy guruh ID
const ADMIN_IDS = (process.env.LOGISTICS_ADMIN_IDS || '').split(',').map(id => parseInt(id.trim()));

let bot = null;
let telegramClient = null;
let monitoredGroups = [];
let cachedAnnouncements = []; // Kunlik e'lonlar uchun

/**
 * Bot'ni ishga tushirish
 */
function startLogisticsBot(token = BOT_TOKEN) {
  try {
    console.log('🚛 Logistics bot ishga tushirilmoqda...');

    // Database
    initLogisticsDatabase();

    // Bot yaratish
    bot = new TelegramBot(token, { polling: true });

    // Komandalar
    setupCommands();

    // Callback query handler
    setupCallbackHandlers();

    console.log('✅ Logistics bot tayyor!');
    return { success: true };
  } catch (error) {
    console.error('❌ Logistics bot xatosi:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Telegram client'ni o'rnatish (broadcast akkauntlar uchun)
 */
function setTelegramClient(client) {
  telegramClient = client;
  console.log('✅ Telegram client logistics botga ulandi');
}

/**
 * Kuzatiladigan guruhlarni o'rnatish
 */
function setMonitoredGroups(groups) {
  monitoredGroups = groups.filter(g => g.active && g.keywords && g.keywords.length > 0);
  console.log(`✅ ${monitoredGroups.length} ta logistics guruh kuzatilmoqda`);
}

/**
 * Komandalar
 */
function setupCommands() {
  // /start - Ro'yxatdan o'tish
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;

    // Subscriber qo'shish (3 kun trial)
    addSubscriber(userId, username, firstName);

    const keyboard = {
      inline_keyboard: [
        [{ text: '📱 Telefon raqam berish', callback_data: 'request_phone' }],
        [{ text: 'ℹ️ Ma\'lumot', callback_data: 'info' }]
      ]
    };

    bot.sendMessage(chatId, `
🎉 Xush kelibsiz, ${firstName}!

Siz 3 kunlik BEPUL trial oldingiz!

Guruhga qo'shilish uchun telefon raqamingizni yuboring.
    `, { reply_markup: keyboard });
  });

  // Telefon raqam qabul qilish
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const phone = msg.contact.phone_number;

    // Subscriber yangilash
    const subscriber = getSubscriber(userId);
    if (subscriber) {
      bot.sendMessage(chatId, `
✅ Telefon raqam qabul qilindi: ${phone}

Admin tez orada sizni guruhga qo'shadi!

3 kunlik trial muddatingiz: ${new Date(subscriber.trial_end).toLocaleDateString('uz-UZ')} gacha
      `);

      // Adminga xabar
      for (const adminId of ADMIN_IDS) {
        bot.sendMessage(adminId, `
🆕 Yangi foydalanuvchi:
👤 ${msg.from.first_name} (@${msg.from.username})
📱 ${phone}
🆔 User ID: ${userId}

/invite_${userId} - Guruhga qo'shish
        `);
      }
    }
  });

  // Admin komandalar
  bot.onText(/\/invite_(\d+)/, async (msg, match) => {
    const adminId = msg.from.id;
    if (!ADMIN_IDS.includes(adminId)) {
      return bot.sendMessage(msg.chat.id, '❌ Sizda ruxsat yo\'q');
    }

    const userId = parseInt(match[1]);

    try {
      // Guruhga invite qilish
      await bot.getChatMember(TARGET_GROUP_ID, userId);
      bot.sendMessage(msg.chat.id, '✅ Foydalanuvchi guruhga qo\'shildi!');
    } catch (error) {
      bot.sendMessage(msg.chat.id, `❌ Xato: ${error.message}\n\nGuruh ID to'g'ri ekanligini tekshiring.`);
    }
  });

  // Stats
  bot.onText(/\/stats/, async (msg) => {
    const adminId = msg.from.id;
    if (!ADMIN_IDS.includes(adminId)) return;

    const { getStats } = require('../database/logistics');
    const stats = getStats();

    bot.sendMessage(msg.chat.id, `
📊 STATISTIKA

📦 Yukchi raqamlar: ${stats.yukchiCount}
🚗 Dispecher raqamlar: ${stats.dispecherCount}
📝 Jami e'lonlar: ${stats.announcementsCount}
👥 Subscribers: ${stats.activeSubscribers} / ${stats.subscribersCount}
    `);
  });
}

/**
 * Callback handlers
 */
function setupCallbackHandlers() {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    const data = query.data;

    // Telefon raqam so'rash
    if (data === 'request_phone') {
      const keyboard = {
        keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true
      };

      bot.sendMessage(chatId, 'Quyidagi tugmani bosing:', { reply_markup: keyboard });
      return bot.answerCallbackQuery(query.id);
    }

    // Ma'lumot
    if (data === 'info') {
      bot.sendMessage(chatId, `
ℹ️ TIZIM HAQIDA

Bu bot logistics e'lonlarini ikkiga bo'ladi:
📦 Yukchi e'lonlari
🚗 Dispecher e'lonlari

💰 NARXLAR:
- Kunlik: 5000 so'm
- Haftalik: 30000 so'm
- Oylik: 100000 so'm

🎁 3 kunlik BEPUL trial!
      `);
      return bot.answerCallbackQuery(query.id);
    }

    // Raqamni olish
    if (data.startsWith('get_phone_')) {
      const announcementId = parseInt(data.replace('get_phone_', ''));

      // Subscriber tekshirish
      const subscriber = getSubscriber(userId);
      if (!subscriber) {
        bot.answerCallbackQuery(query.id, {
          text: '❌ Avval /start buyrug\'ini bering!',
          show_alert: true
        });
        return;
      }

      // Trial/subscription tekshirish
      const now = new Date();
      const trialEnd = new Date(subscriber.trial_end);
      const subscriptionEnd = subscriber.subscription_end ? new Date(subscriber.subscription_end) : null;

      const hasAccess =
        (subscriber.status === 'trial' && now < trialEnd) ||
        (subscriber.status === 'active' && subscriptionEnd && now < subscriptionEnd);

      if (!hasAccess) {
        bot.answerCallbackQuery(query.id, {
          text: '❌ Trial tugadi! To\'lov qiling.',
          show_alert: true
        });
        return;
      }

      // Raqam olingan-olinmaganini tekshirish
      if (isPhoneTaken(announcementId)) {
        bot.answerCallbackQuery(query.id, {
          text: '❌ Bu raqam allaqachon olingan!',
          show_alert: true
        });
        return;
      }

      // Raqamni berish
      const { default: betterSqlite3 } = await import('better-sqlite3');
      const Database = betterSqlite3;
      const path = require('path');
      const dbPath = path.join(__dirname, '../../data/logistics.db');
      const db = new Database(dbPath);

      const announcement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(announcementId);

      if (announcement && announcement.phone) {
        markPhoneTaken(announcementId, userId);

        bot.sendMessage(userId, `
✅ Raqam sizga berildi!

📱 ${announcement.phone}

Muvaffaqiyatlar!
        `);

        bot.answerCallbackQuery(query.id, {
          text: '✅ Raqam yuborildi!',
          show_alert: false
        });
      } else {
        bot.answerCallbackQuery(query.id, {
          text: '❌ Raqam topilmadi',
          show_alert: true
        });
      }

      db.close();
      return;
    }

    // Admin to'g'rilash O'CHIRILDI (klassifikatsiyaga aralashmaydi)

    bot.answerCallbackQuery(query.id);
  });
}

/**
 * Yangi xabarni qayta ishlash (broadcast akkauntlar orqali)
 */
async function processNewMessage(message, groupId, groupName) {
  try {
    // Faqat kalit so'zli guruhlar
    const group = monitoredGroups.find(g => g.id === groupId);
    if (!group) return;

    const messageText = message.message || '';
    const userId = message.senderId?.value || message.fromId?.userId?.value;
    const username = message.sender?.username || '';
    const firstName = message.sender?.firstName || '';

    // Telefon raqam extract
    const phone = extractPhone(messageText);
    if (!phone) return; // Raqam yo'q bo'lsa skip

    // Dublikat tekshirish (1 soat ichida)
    const textHash = crypto.createHash('md5').update(messageText).digest('hex');
    if (isDuplicate(textHash, phone)) {
      console.log('⏭️ Dublikat e\'lon, skip');
      return;
    }

    // Klassifikatsiya
    const classification = await classifyUser(
      userId,
      username,
      firstName,
      messageText,
      telegramClient,
      monitoredGroups,
      cachedAnnouncements
    );

    const { category, score, details } = classification;

    console.log(`\n📊 Klassifikatsiya: ${category.toUpperCase()} (${score} ball)`);
    console.log(`   Guruhlar: ${details.groupsCount}, Kunlik: ${details.dailyPostsCount}, Multi: ${details.hasMultiRoutes}`);

    // Database'ga saqlash
    if (category === 'yukchi') {
      addOrUpdateYukchiPhone(phone, userId, username, firstName);
    } else {
      addOrUpdateDispecherPhone(phone, userId, username, firstName);
    }

    // E'lonni saqlash
    const announcementResult = saveAnnouncement({
      messageId: message.id,
      category,
      userTelegramId: userId,
      username,
      firstName,
      phone,
      rawText: messageText,
      formattedText: formatAnnouncement(messageText, category),
      classificationScore: score,
      classificationDetails: details,
      sourceGroupId: groupId,
      sourceGroupName: groupName,
      isDuplicate: false
    });

    // Duplicate cache'ga qo'shish
    addToDuplicateCache(textHash, phone, userId);

    // Cached announcements'ga qo'shish (kunlik limit uchun)
    cachedAnnouncements.push({
      user_telegram_id: userId,
      posted_at: new Date().toISOString()
    });

    // Eski cache'ni tozalash (bugun bo'lmaganlarini)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cachedAnnouncements = cachedAnnouncements.filter(a => {
      const date = new Date(a.posted_at);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    });

    // User classification saqlash
    saveUserClassification(userId, username, firstName, category, score, details);

    // Guruhga post qilish
    await postToTargetGroup(announcementResult.lastInsertRowid, category, formatAnnouncement(messageText, category), score, details);

    console.log('✅ E\'lon muvaffaqiyatli qayta ishlandi');

  } catch (error) {
    console.error('❌ processNewMessage xatosi:', error);
  }
}

/**
 * Mavzuli guruhga post qilish
 */
async function postToTargetGroup(announcementId, category, formattedText, score, details) {
  try {
    if (!bot || !TARGET_GROUP_ID) {
      console.log('⚠️ Bot yoki TARGET_GROUP_ID sozlanmagan');
      return;
    }

    // Topic ID (mavzu ID) - Yoldauz | Rasmiy guruhida yaratilgan
    // MUHIM: Guruhda yaratilgan topic ID'larni .env'ga qo'shing
    // LOGISTICS_TOPIC_YUKCHI=... va LOGISTICS_TOPIC_DISPECHER=...
    const yukchiTopicId = process.env.LOGISTICS_TOPIC_YUKCHI || null;
    const dispecherTopicId = process.env.LOGISTICS_TOPIC_DISPECHER || null;
    const topicId = category === 'yukchi' ? yukchiTopicId : dispecherTopicId;

    // Inline buttons (faqat raqam olish)
    const keyboard = {
      inline_keyboard: [
        [{ text: '📞 Raqamni olish', callback_data: `get_phone_${announcementId}` }]
      ]
    };

    // Post options
    const postOptions = {
      reply_markup: keyboard
    };

    // Faqat topic ID bo'lsa qo'shish (forum group uchun)
    if (topicId) {
      postOptions.message_thread_id = parseInt(topicId);
    }

    // Post
    await bot.sendMessage(TARGET_GROUP_ID, `
${formattedText}

📊 Score: ${score} | Guruhlar: ${details.groupsCount} | Kunlik: ${details.dailyPostsCount}
    `, postOptions);

    console.log(`✅ Guruhga post qilindi: ${category}`);
  } catch (error) {
    console.error('❌ postToTargetGroup xatosi:', error);
  }
}

/**
 * Trial muddati tugaganlarni tekshirish (har soatda)
 */
function checkTrialExpired() {
  setInterval(() => {
    try {
      const { default: betterSqlite3 } = require('better-sqlite3');
      const Database = betterSqlite3;
      const path = require('path');
      const dbPath = path.join(__dirname, '../../data/logistics.db');
      const db = new Database(dbPath);

      const expiredUsers = db.prepare(`
        SELECT * FROM subscribers
        WHERE status = 'trial' AND trial_end < datetime('now')
      `).all();

      for (const user of expiredUsers) {
        // Status o'zgartirish
        updateSubscriberStatus(user.telegram_id, 'expired');

        // Guruhdan chiqarish
        bot.banChatMember(TARGET_GROUP_ID, user.telegram_id)
          .then(() => {
            bot.unbanChatMember(TARGET_GROUP_ID, user.telegram_id); // Unban (kick only)
          })
          .catch(err => console.error('Kick error:', err));

        // Xabar yuborish
        bot.sendMessage(user.telegram_id, `
⏰ Trial muddatingiz tugadi!

To'lov qilish uchun admin bilan bog'laning.

💰 NARXLAR:
- Kunlik: 5000 so'm
- Haftalik: 30000 so'm
- Oylik: 100000 so'm
        `);
      }

      db.close();
    } catch (error) {
      console.error('checkTrialExpired xatosi:', error);
    }
  }, 60 * 60 * 1000); // Har soatda
}

module.exports = {
  startLogisticsBot,
  setTelegramClient,
  setMonitoredGroups,
  processNewMessage,
  checkTrialExpired
};
