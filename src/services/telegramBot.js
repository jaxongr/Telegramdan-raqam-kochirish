/**
 * Telegram Bot Interface
 *
 * Bot orqali tizimni boshqarish:
 * - /start - Botni boshlash
 * - /scan <guruh_nomi> - Skanerlash boshlash
 * - /stats - Statistika
 * - /status - Hozirgi holat
 * - /pause - To'xtatish
 * - /resume - Davom ettirish
 * - /blacklist <raqam> - Qora ro'yxatga qo'shish
 * - /help - Yordam
 */

const { Telegraf } = require('telegraf');
const logger = require('../utils/logger');
const { getAllGroups } = require('../database/models');
const { addToBlacklist, getBlacklistStats } = require('../database/blacklist');

// Bot token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8364976076:AAGrM4eI1sAh12VRpQEprBMd9u9fUNQimmg';

// Admin user IDs (faqat bu userlar botdan foydalanishi mumkin)
const ADMIN_IDS = process.env.TELEGRAM_ADMIN_IDS
  ? process.env.TELEGRAM_ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

let bot = null;
let isRunning = false;

/**
 * Admin check middleware
 */
function isAdmin(ctx) {
  if (ADMIN_IDS.length === 0) {
    // Agar admin list bo'lmasa, hamma ruxsat
    return true;
  }

  return ADMIN_IDS.includes(ctx.from.id);
}

/**
 * Bot ni boshlash
 */
async function startBot() {
  if (isRunning) {
    logger.warn('Telegram bot allaqachon ishlab turibdi');
    return;
  }

  try {
    bot = new Telegraf(BOT_TOKEN);

    // Middleware - admin check
    bot.use(async (ctx, next) => {
      if (!isAdmin(ctx)) {
        logger.warn(`❌ Unauthorized bot access: ${ctx.from.id} (${ctx.from.username})`);
        await ctx.reply('❌ Sizda bu botdan foydalanish huquqi yo\'q!');
        return;
      }
      return next();
    });

    // /start - Botni boshlash
    bot.command('start', async (ctx) => {
      const welcomeMsg = `
🤖 *Telegram SMS Tizim Bot*

Assalomu alaykum! Bu bot orqali tizimni boshqarishingiz mumkin.

*Mavjud komandalar:*
/scan - Skanerlash boshlash
/status - Hozirgi holat
/stats - Statistika
/blacklist - Qora ro'yxat
/pause - To'xtatish
/resume - Davom ettirish
/help - Yordam

👤 Admin: ${ctx.from.first_name}
🆔 User ID: ${ctx.from.id}
      `;

      await ctx.replyWithMarkdown(welcomeMsg);
      logger.info(`✅ Bot started by ${ctx.from.username} (${ctx.from.id})`);
    });

    // /help - Yordam
    bot.command('help', async (ctx) => {
      const helpMsg = `
📚 *Yordam*

*Komandalar:*

\`/scan\` - Barcha guruhlarni skanerlashni boshlash
\`/scan <guruh_nomi>\` - Bitta guruhni skanerlash

\`/status\` - Hozirgi skanerlash holati

\`/stats\` - Umumiy statistika:
  • Jami guruhlar
  • Jami telefon raqamlar
  • Jami SMS yuborilgan
  • Qora ro'yxat

\`/blacklist <raqam>\` - Raqamni qora ro'yxatga qo'shish
Misol: \`/blacklist +998901234567\`

\`/pause\` - Skanerlashni to'xtatish
\`/resume\` - Skanerlashni davom ettirish

*Xavfsizlik:*
Faqat admin userlar botdan foydalana oladi.
Admin IDs: ${ADMIN_IDS.join(', ') || 'Barcha userlar (xavfsiz emas!)'}
      `;

      await ctx.replyWithMarkdown(helpMsg);
    });

    // /status - Hozirgi holat
    bot.command('status', async (ctx) => {
      try {
        const { getQueueStatus, currentProgress } = require('./historyScraper');
        const queue = getQueueStatus();
        const progress = currentProgress || {};

        let statusMsg = '📊 *Tizim Holati*\n\n';

        if (progress.isRunning) {
          statusMsg += `✅ Skanerlash: *Ishlab turibdi*\n`;
          statusMsg += `📖 Guruh: ${progress.groupName || 'N/A'}\n`;
          statusMsg += `📨 Xabarlar: ${progress.processedMessages}/${progress.totalMessages}\n`;
          statusMsg += `📞 Raqamlar: ${progress.phonesFound} (${progress.uniquePhones} unikal)\n`;
          statusMsg += `⚡ Tezlik: ${progress.messagesPerMinute} msg/min\n`;

          if (progress.isPaused) {
            statusMsg += `\n⏸ *Pauza qilingan*`;
          }
        } else {
          statusMsg += `⏹ Skanerlash: *To'xtagan*\n`;
        }

        // Navbat
        if (queue.pendingTasks && queue.pendingTasks.length > 0) {
          statusMsg += `\n📋 Navbatda: ${queue.pendingTasks.length} ta task\n`;
          statusMsg += `Keyingi: ${queue.pendingTasks[0].name}`;
        } else {
          statusMsg += `\n📋 Navbat: *Bo'sh*`;
        }

        await ctx.replyWithMarkdown(statusMsg);
      } catch (error) {
        logger.error('Status command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /stats - Statistika
    bot.command('stats', async (ctx) => {
      try {
        const { getDB } = require('../database/index');
        const db = getDB();

        const blacklistStats = await getBlacklistStats();

        const statsMsg = `
📊 *Umumiy Statistika*

📁 *Guruhlar:* ${db.groups.length} ta
  └ Faol: ${db.groups.filter(g => g.active).length} ta

📞 *Telefon Raqamlar:* ${db.phones.length} ta
  └ Unikal: ${new Set(db.phones.map(p => p.phone)).size} ta

📨 *SMS Loglar:* ${db.sms_logs.length} ta
  └ Success: ${db.sms_logs.filter(s => s.status === 'success').length} ta
  └ Failed: ${db.sms_logs.filter(s => s.status === 'failed').length} ta

🚫 *Qora Ro'yxat:* ${blacklistStats.total} ta

📱 *SemySMS:* ${db.semysms_phones.length} ta
  └ Faol: ${db.semysms_phones.filter(p => p.status === 'active').length} ta
        `;

        await ctx.replyWithMarkdown(statsMsg);
      } catch (error) {
        logger.error('Stats command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /scan - Skanerlash boshlash
    bot.command('scan', async (ctx) => {
      try {
        const args = ctx.message.text.split(' ').slice(1);
        const groupName = args.join(' ');

        const groups = await getAllGroups();

        if (!groupName) {
          // Barcha guruhlar ro'yxati
          if (groups.length === 0) {
            await ctx.reply('❌ Guruhlar yo\'q!');
            return;
          }

          let msg = '📋 *Mavjud Guruhlar:*\n\n';
          groups.forEach((g, i) => {
            msg += `${i + 1}. ${g.name} (${g.active ? '✅' : '❌'})\n`;
          });
          msg += '\n💡 Skanerlash: `/scan <guruh_nomi>`';

          await ctx.replyWithMarkdown(msg);
          return;
        }

        // Guruhni qidirish
        const group = groups.find(g =>
          g.name.toLowerCase().includes(groupName.toLowerCase())
        );

        if (!group) {
          await ctx.reply(`❌ Guruh topilmadi: ${groupName}`);
          return;
        }

        // TODO: Skanerlashni boshlash
        await ctx.reply(`🚀 Skanerlash boshlandi: ${group.name}\n\nHozircha bu funksiya ishlamaydi. Web interfeysdan foydalaning: /history`);

        logger.info(`📱 Bot: Scan requested for ${group.name} by ${ctx.from.username}`);
      } catch (error) {
        logger.error('Scan command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /blacklist - Qora ro'yxatga qo'shish
    bot.command('blacklist', async (ctx) => {
      try {
        const args = ctx.message.text.split(' ').slice(1);
        const phone = args[0];

        if (!phone) {
          await ctx.reply('❌ Telefon raqamni kiriting!\n\nMisol: /blacklist +998901234567');
          return;
        }

        const result = await addToBlacklist(phone, 'bot', `Added by ${ctx.from.username}`);

        if (result.success) {
          await ctx.reply(`✅ Qora ro'yxatga qo'shildi: ${result.phone}`);
          logger.info(`📱 Bot: Blacklist added ${result.phone} by ${ctx.from.username}`);
        } else {
          await ctx.reply(`❌ Xato: ${result.error === 'already_in_blacklist' ? 'Raqam allaqachon qora ro\'yxatda' : result.error}`);
        }
      } catch (error) {
        logger.error('Blacklist command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /pause - To'xtatish
    bot.command('pause', async (ctx) => {
      try {
        // TODO: Pause funksiyasi
        await ctx.reply('⏸ Pause funksiyasi hozircha ishlamaydi. Web interfeysdan foydalaning.');
      } catch (error) {
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /resume - Davom ettirish
    bot.command('resume', async (ctx) => {
      try {
        // TODO: Resume funksiyasi
        await ctx.reply('▶️ Resume funksiyasi hozircha ishlamaydi. Web interfeysdan foydalaning.');
      } catch (error) {
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // Error handling
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      ctx.reply('❌ Ichki xato yuz berdi. Admin bilan bog\'laning.');
    });

    // Launch bot
    await bot.launch();
    isRunning = true;

    logger.info('✅ Telegram bot ishga tushdi');

    // Graceful shutdown
    process.once('SIGINT', () => stopBot());
    process.once('SIGTERM', () => stopBot());

  } catch (error) {
    logger.error('Bot start xatosi:', error);
    throw error;
  }
}

/**
 * Bot ni to'xtatish
 */
function stopBot() {
  if (bot && isRunning) {
    bot.stop('SIGINT');
    isRunning = false;
    logger.info('🛑 Telegram bot to\'xtatildi');
  }
}

/**
 * Bot holatini olish
 */
function getBotStatus() {
  return {
    isRunning,
    botToken: BOT_TOKEN ? `${BOT_TOKEN.substring(0, 10)}...` : 'Not set',
    adminIds: ADMIN_IDS
  };
}

module.exports = {
  startBot,
  stopBot,
  getBotStatus
};
