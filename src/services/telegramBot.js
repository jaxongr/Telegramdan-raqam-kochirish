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
const historyScraper = require('./historyScraper');
const { stopScraping, pauseScraping, resumeScraping } = require('./historyScraper');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Bot token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
    if (!BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN .env faylda yo\'q');
    }
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
        const groups = await getAllGroups();

        if (groups.length === 0) {
          await ctx.reply('❌ Guruhlar yo\'q!');
          return;
        }

        // Inline tugmalar yaratish
        const keyboard = [];
        groups.forEach((group) => {
          const status = group.active ? '✅' : '❌';
          keyboard.push([{
            text: `${status} ${group.name}`,
            callback_data: `scan_${group.id}`
          }]);
        });

        await ctx.reply('📋 Skanerlash uchun guruhni tanlang:', {
          reply_markup: {
            inline_keyboard: keyboard
          }
        });
      } catch (error) {
        logger.error('Scan command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // Callback query handler - tugma bosilganda
    bot.on('callback_query', async (ctx) => {
      try {
        const data = ctx.callbackQuery.data;

        // Stop tugmasi bosilganda
        if (data === 'stop_scan') {
          await ctx.answerCbQuery('🛑 To\'xtatilmoqda...');

          stopScraping();

          await ctx.editMessageText(
            '🛑 *Skan to\'xtatildi*\n\nNatijalar tayyor bo\'lganda yuboriladi.',
            { parse_mode: 'Markdown' }
          );
          return;
        }

        if (data.startsWith('scan_')) {
          const groupId = parseInt(data.replace('scan_', ''));
          const groups = await getAllGroups();
          const group = groups.find(g => g.id === groupId);

          if (!group) {
            await ctx.answerCbQuery('❌ Guruh topilmadi!');
            return;
          }

          await ctx.answerCbQuery('🚀 Skan boshlanmoqda...');

          const messageId = ctx.callbackQuery.message.message_id;
          const chatId = ctx.callbackQuery.message.chat.id;

          // Boshlang'ich xabar
          await ctx.editMessageText(
            `🚀 *Skan boshlanmoqda...*\n\n` +
            `📂 Guruh: ${group.name}\n` +
            `⏳ Tayyorlanmoqda...`,
            { parse_mode: 'Markdown' }
          );

          try {
            // Skanerlashni boshlash (oxirgi 30 kun - 1 oy)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            // Fayl nomi
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const timeStamp = Date.now();
            const customFilename = `bot_scan_${group.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}_${timeStamp}.json`;

            // Navbatga qo'shish (web interfeys bilan bir xil tizim)
            const { addToQueue } = require('./historyScraper');

            const task = {
              name: `Bot scan: ${group.name}`,
              filename: customFilename,
              execute: async () => {
                logger.info(`🤖 BOT: Scan boshlandi - ${group.name}`);
                return await historyScraper.scrapeGroupHistoryByDate(
                  group.id,
                  startDate,
                  endDate,
                  null, // resumeFile
                  customFilename
                );
              }
            };

            const queueInfo = addToQueue(task);
            console.log(`✅ CHECKPOINT 1: Queue info`, queueInfo);
            logger.info(`📱 Bot scan queued: ${group.name} by user ${ctx.from.id}, position: ${queueInfo.queuePosition}`);

            // Navbat ma'lumotini ko'rsatish
            console.log(`✅ CHECKPOINT 2: Before editMessageText`, { chatId, messageId });
            await bot.telegram.editMessageText(
              chatId,
              messageId,
              null,
              `📋 *Navbatga qo'shildi!*\n\n` +
              `📂 Guruh: ${group.name}\n` +
              `📊 Davomiylik: 30 kun\n` +
              `🔢 Navbatda: ${queueInfo.queuePosition}-o'rinda\n\n` +
              `⏳ Skan boshlanguncha kuting...\n` +
              `📱 Tugagach bu yerda fayl yuboriladi.`,
              { parse_mode: 'Markdown' }
            );
            console.log(`✅ CHECKPOINT 3: After editMessageText`);

            // Progress kuzatish (background'da)
            let lastUpdate = Date.now();
            let lastStatus = 'waiting'; // waiting, scanning, done
            console.log(`✅ CHECKPOINT 4: About to start progress interval for ${customFilename}`);
            logger.info(`🤖 BOT: Progress interval started for ${customFilename}`);

            const progressInterval = setInterval(async () => {
              try {
                const progress = historyScraper.getProgress();
                const filePath = path.join(__dirname, '../../exports', customFilename);

                console.log(`🔍 BOT: isRunning=${progress.isRunning}, file=${fs.existsSync(filePath)}`);

                // Agar skanerlash davom etayotgan bo'lsa
                if (progress.isRunning) {
                  console.log(`✅ isRunning=true, updating progress...`);
                  // Skanerlash ishlayapti - progress ko'rsatish
                  if (lastStatus !== 'scanning') {
                    lastStatus = 'scanning';
                    console.log(`📢 Status changed to scanning`);
                  }

                  const percent = progress.totalMessages > 0
                    ? Math.round((progress.processedMessages / progress.totalMessages) * 100)
                    : 0;

                  const progressBar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));

                  // Sana formatini yaratish
                  let dateInfo = '';
                  if (progress.currentDate) {
                    const currentDate = new Date(progress.currentDate);
                    dateInfo = `\n📅 Sana: ${currentDate.getDate()}/${currentDate.getMonth()+1}/${currentDate.getFullYear()}`;
                  }

                  console.log(`📊 Sending progress: ${percent}%, ${progress.processedMessages}/${progress.totalMessages}`);

                  try {
                    await bot.telegram.editMessageText(
                      chatId,
                      messageId,
                      null,
                      `📊 *Skan davom etmoqda...*\n\n` +
                      `📂 Guruh: ${group.name}\n` +
                      `${progressBar} ${percent}%\n\n` +
                      `📨 Xabarlar: ${progress.processedMessages || 0} / ${progress.totalMessages || '?'}\n` +
                      `📱 Raqamlar: ${progress.phonesFound || 0} ta\n` +
                      `✨ Unikal: ${progress.uniquePhones || 0} ta\n` +
                      `⚡️ Tezlik: ${progress.messagesPerMinute || 0} msg/min` +
                      dateInfo,
                      {
                        parse_mode: 'Markdown',
                        reply_markup: {
                          inline_keyboard: [[
                            { text: '🛑 To\'xtatish', callback_data: 'stop_scan' }
                          ]]
                        }
                      }
                    );
                    console.log(`✅ Progress updated successfully`);
                  } catch (editError) {
                    console.log(`⚠️ editMessageText error: ${editError.message}`);
                  }
                } else {
                  // Task navbatda yo'q - tugagan bo'lishi mumkin
                  if (fs.existsSync(filePath)) {
                    // Faylning yoshini tekshirish - faqat yangi fayl (oxirgi 2 daqiqa)
                    const fileStats = fs.statSync(filePath);
                    const fileAge = Date.now() - fileStats.mtimeMs;
                    const maxAge = 120000; // 2 daqiqa

                    if (fileAge > maxAge) {
                      // Eski fayl - bu bizning faylimiz emas
                      logger.warn(`🤖 BOT: Eski fayl topildi (${Math.round(fileAge/1000)}s oldin) - kutilmoqda...`);
                      return;
                    }

                    // Fayl yangi - tugagan!
                    clearInterval(progressInterval);
                    lastStatus = 'done';
                    logger.info(`🤖 BOT: Task tugadi, fayl yuborilmoqda - ${customFilename}`);

                    // Fayldan statistika o'qish va Excel yaratish
                    let totalPhones = 0;
                    let uniquePhones = 0;

                    try {
                      const fileContent = fs.readFileSync(filePath, 'utf8');
                      const data = JSON.parse(fileContent);
                      totalPhones = data.totalPhones || 0;
                      uniquePhones = data.uniquePhones || 0;

                      // Excel fayl yaratish
                      if (data.phonesFound && data.phonesFound.length > 0) {
                        const excelData = data.phonesFound.map(item => ({
                          'Telefon': item.phone,
                          'Xabar': item.message || '',
                          'Sana': item.date ? new Date(item.date).toLocaleString('uz-UZ') : ''
                        }));

                        const ws = XLSX.utils.json_to_sheet(excelData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, 'Raqamlar');

                        const excelFilename = customFilename.replace('.json', '.xlsx');
                        const excelPath = path.join(__dirname, '../../exports', excelFilename);
                        XLSX.writeFile(wb, excelPath);

                        // Faqat Excel faylni yuborish
                        await bot.telegram.sendDocument(chatId, {
                          source: fs.createReadStream(excelPath),
                          filename: excelFilename
                        }, {
                          caption: `✅ *Skan tugadi!*\n\n` +
                            `📂 Guruh: ${group.name}\n` +
                            `📱 Raqamlar: ${totalPhones} ta (${uniquePhones} unikal)\n` +
                            `📊 Excel formatda tayyor`,
                          parse_mode: 'Markdown'
                        });

                        // Excel faylni o'chirish
                        fs.unlinkSync(excelPath);
                      }

                      // Arxivga saqlash - JSON faylni kopyalash
                      const archivePath = path.join(__dirname, '../../data/archive');
                      if (!fs.existsSync(archivePath)) {
                        fs.mkdirSync(archivePath, { recursive: true });
                      }
                      fs.copyFileSync(filePath, path.join(archivePath, customFilename));
                      logger.info(`📦 Arxivga saqlandi: ${customFilename}`);

                    } catch (excelError) {
                      logger.error('Excel yaratishda xato:', excelError);
                    }
                  } else {
                    // Fayl yo'q va navbatda yo'q - muammo bo'lishi mumkin
                    // Yana bir oz kutamiz
                  }
                }
              } catch (err) {
                logger.error('🤖 BOT Progress update error:', err);
              }
            }, 10000); // Har 10 soniyada

          } catch (scanError) {
            logger.error('Scan start error:', scanError);
            await bot.telegram.editMessageText(
              chatId,
              messageId,
              null,
              `❌ *Xato yuz berdi!*\n\n${scanError.message}`,
              { parse_mode: 'Markdown' }
            );
          }
        }
      } catch (error) {
        logger.error('Callback query error:', error);
        await ctx.answerCbQuery('❌ Xato yuz berdi');
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
        const success = pauseScraping();
        if (success) {
          await ctx.reply('⏸ *Pauza qilindi*\n\nSkanerlash pauza qilindi. Davom ettirish uchun /resume ni bosing.', {
            parse_mode: 'Markdown'
          });
          logger.info(`⏸️ Bot: Pause by user ${ctx.from.id}`);
        } else {
          await ctx.reply('⚠️ Hech qanday skanerlash jarayoni ishlamayapti yoki allaqachon pauzada.');
        }
      } catch (error) {
        logger.error('Pause command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /resume - Davom ettirish
    bot.command('resume', async (ctx) => {
      try {
        const success = resumeScraping();
        if (success) {
          await ctx.reply('▶️ *Davom ettirildi*\n\nSkanerlash qayta boshlandi.', {
            parse_mode: 'Markdown'
          });
          logger.info(`▶️ Bot: Resume by user ${ctx.from.id}`);
        } else {
          await ctx.reply('⚠️ Pauza qilingan jarayon yo\'q.');
        }
      } catch (error) {
        logger.error('Resume command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // /stop - To'xtatish (butunlay)
    bot.command('stop', async (ctx) => {
      try {
        const success = stopScraping();
        if (success) {
          await ctx.reply('🛑 *To\'xtatish buyrug\'i berildi*\n\nSkanerlash to\'xtatilmoqda...', {
            parse_mode: 'Markdown'
          });
          logger.info(`🛑 Bot: Stop by user ${ctx.from.id}`);
        } else {
          await ctx.reply('⚠️ Hech qanday skanerlash jarayoni ishlamayapti.');
        }
      } catch (error) {
        logger.error('Stop command error:', error);
        await ctx.reply('❌ Xato: ' + error.message);
      }
    });

    // Error handling
    bot.catch((err, ctx) => {
      logger.error('Bot error:', err);
      ctx.reply('❌ Ichki xato yuz berdi. Admin bilan bog\'laning.');
    });

    // Launch bot (non-blocking)
    bot.launch().then(() => {
      logger.info('✅ Telegram bot polling started');
    }).catch(err => {
      logger.error('Bot launch error:', err);
    });

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
