require('dotenv').config();
const { initDatabase } = require('./database');
const { initBroadcastDatabase } = require('./database/sqlite');
const app = require('./web/app');
const logger = require('./utils/logger');

const PORT = process.env.WEB_PORT || 3000;
const MODE = process.env.MODE || 'demo';
const isServerMode = MODE === 'server' || MODE === 'production';

async function main() {
  try {
    console.log('=== Telegram SMS Tizim Boshlandi ===');

    // 1) Database
    console.log('[1/3] Database ishga tushirilmoqda...');
    await initDatabase();
    initBroadcastDatabase();
    console.log('Database tayyor');

    // 2) Telegram client (faqat server/production)
    if (isServerMode) {
      console.log('[2/3] Telegram client ishga tushirilmoqda...');
      const telegramClient = require('./services/telegramClient');
      const historyScraper = require('./services/historyScraper');

      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      const phone = process.env.TELEGRAM_PHONE;
      const session = process.env.TELEGRAM_SESSION || '';

      if (!apiId || !apiHash || !phone) {
        console.error("Xato: TELEGRAM_API_ID, TELEGRAM_API_HASH va TELEGRAM_PHONE .env faylda yo'q!");
        console.log('> REAL_SETUP.md faylini o\'qing');
        process.exit(1);
      }

      const result = await telegramClient.startTelegramClient(apiId, apiHash, phone, session);

      if (!result.success) {
        console.error('Telegram client xatosi:', result.error);
        process.exit(1);
      }

      console.log('Telegram client ulandi');

      // Yangi session bo'lsa .env ga yozish
      if (result.session && result.session !== session) {
        console.log('Yangi session yaratildi');
        console.log(".env fayliga qo'shing:");
        console.log('TELEGRAM_SESSION=' + result.session);

        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '../.env');
        let envContent = '';
        try {
          envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        } catch (_) {
          envContent = '';
        }
        const regex = /^TELEGRAM_SESSION=.*$/m;
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, 'TELEGRAM_SESSION=' + result.session);
        } else {
          if (envContent.length > 0 && !envContent.endsWith('\n')) envContent += '\n';
          envContent += 'TELEGRAM_SESSION=' + result.session + '\n';
        }
        try {
          fs.writeFileSync(envPath, envContent);
          console.log('Session .env faylga avtomatik saqlandi!');
        } catch (e) {
          console.error("TELEGRAM_SESSION ni .env ga yozib bo'lmadi:", e.message);
        }
      }

      // Client ni boshqa servislarga ulash
      const { getClient } = require('./services/telegramClient');
      historyScraper.setClient(getClient());

      // UniqueUserScraper uchun ham client o'rnatish
      const uniqueUserScraper = require('./services/uniqueUserScraper');
      uniqueUserScraper.setClient(getClient());

      const messagesRouter = require('./web/routes/messages');
      messagesRouter.setTelegramClient(getClient());

      // Monitoring
      await telegramClient.startMonitoring();
      console.log('Monitoring boshlandi');

      // Logistics bot (ixtiyoriy)
      if (process.env.LOGISTICS_BOT_TOKEN) {
        console.log('[LOGISTICS] Bot ishga tushirilmoqda...');
        const logisticsBot = require('./services/logisticsBot');
        const logisticsBotResult = logisticsBot.startLogisticsBot();
        if (logisticsBotResult.success) {
          console.log('Logistics bot tayyor');
          logisticsBot.setTelegramClient(getClient());
          const { getActiveGroups } = require('./database/models');
          const activeGroups = await getActiveGroups();
          logisticsBot.setMonitoredGroups(activeGroups);
          logisticsBot.checkTrialExpired();
          console.log("Logistics bot to'liq sozlandi");
        } else {
          console.error('Logistics bot xatosi:', logisticsBotResult.error);
        }
      }

      // Auto-resume
      const { checkAndResumeScans } = require('./services/autoResume');
      setTimeout(async () => {
        console.log('Avtomatik resume tekshiruvi boshlandi...');
        try {
          await checkAndResumeScans();
          console.log('Resume tekshiruvi tugadi');
        } catch (err) {
          console.error('Auto-resume xatosi:', err);
        }
      }, 15000);
    } else {
      console.log("[2/3] LOKAL REJIM (Telegram o'chirilgan - faqat web dashboard)");
    }

    // 3) Telegram Bot (opsional)
    if (process.env.TELEGRAM_BOT_ENABLED === 'true' && isServerMode) {
      console.log('[3/4] Telegram bot ishga tushirilmoqda...');
      try {
        const { startBot } = require('./services/telegramBot');
        await startBot();
        console.log('Telegram bot tayyor');
      } catch (botError) {
        console.error('Telegram bot xatosi:', botError.message);
        console.log('Bot o\'chirilgan - davom etadi...');
      }
    }

    // 4) Web server
    console.log('[4/4] Web dashboard ishga tushirilmoqda...');
    app.listen(PORT, () => {
      console.log(`Web dashboard: http://localhost:${PORT}`);
      console.log("\n=== Tizim to'liq ishga tushdi ===\n");

      if (isServerMode) {
        console.log('SERVER REJIM (Telegram va SemySMS yoqilgan)');
      } else if (MODE === 'demo') {
        console.log('DEMO REJIM (Telegram va SemySMS kerak emas)');
      } else {
        console.log("LOKAL REJIM (Faqat web dashboard - Telegram serverda ishlaydi)");
      }

      console.log("\nLogin ma'lumotlari:");
      console.log('  Username: ' + (process.env.WEB_USERNAME || 'admin'));
      if (process.env.WEB_PASSWORD_HASH) {
        console.log('  Parol: (WEB_PASSWORD_HASH ishlatilmoqda)');
      } else {
        console.log('  Parol: ' + (process.env.WEB_PASSWORD || 'admin123'));
      }
      console.log('\nBrowserda oching: http://localhost:' + PORT);

      if (MODE === 'demo') {
        console.log("\nReal ishlatish: REAL_SETUP.md faylini o'qing");
      }
    });

  } catch (error) {
    console.error('Tizim ishga tushirishda xato:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log("\n\nTizim to'xtatilmoqda...");
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log("\n\nTizim to'xtatilmoqda...");
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

main();

