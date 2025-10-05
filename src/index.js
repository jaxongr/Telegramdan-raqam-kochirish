require('dotenv').config();
const { initDatabase } = require('./database');
const { initBroadcastDatabase } = require('./database/sqlite'); // YANGI
const app = require('./web/app');
const logger = require('./utils/logger');

const PORT = process.env.WEB_PORT || 3000;
const MODE = process.env.MODE || 'demo';

async function main() {
  try {
    console.log('=== Telegram SMS Tizim Boshlandi ===\n');

    // 1. Database
    console.log('[1/3] Database ishga tushirilmoqda...');
    await initDatabase();
    initBroadcastDatabase(); // YANGI: Broadcast database
    console.log('✓ Database tayyor\n');

    // 2. Telegram Client (faqat serverda ishlaydi)
    if (MODE === 'server') {
      console.log('[2/3] Telegram client ishga tushirilmoqda...');
      const telegramClient = require('./services/telegramClient');
      const historyScraper = require('./services/historyScraper');

      const apiId = process.env.TELEGRAM_API_ID;
      const apiHash = process.env.TELEGRAM_API_HASH;
      const phone = process.env.TELEGRAM_PHONE;
      const session = process.env.TELEGRAM_SESSION || '';

      if (!apiId || !apiHash || !phone) {
        console.error('❌ TELEGRAM_API_ID, TELEGRAM_API_HASH va TELEGRAM_PHONE .env faylda yo\'q!');
        console.log('\n📖 REAL_SETUP.md faylini o\'qing');
        process.exit(1);
      }

      const result = await telegramClient.startTelegramClient(apiId, apiHash, phone, session);

      if (result.success) {
        console.log('✓ Telegram client ulandi');

        // Session'ni saqlash
        if (result.session && result.session !== session) {
          console.log('💾 Yangi session yaratildi');
          console.log('\n📝 .env fayliga qo\'shing:');
          console.log('TELEGRAM_SESSION=' + result.session);
          console.log('\n');

          // Avtomatik .env ga yozish
          const fs = require('fs');
          const path = require('path');
          const envPath = path.join(__dirname, '../.env');
          let envContent = fs.readFileSync(envPath, 'utf8');

          const regex = /^TELEGRAM_SESSION=.*$/m;
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, 'TELEGRAM_SESSION=' + result.session);
          } else {
            envContent = envContent.replace(/^TELEGRAM_SESSION=$/m, 'TELEGRAM_SESSION=' + result.session);
          }

          fs.writeFileSync(envPath, envContent);
          console.log('✅ Session .env faylga avtomatik saqlandi!');
        }

        // History scraper uchun client ni o'rnatish
        const { getClient } = require('./services/telegramClient');
        historyScraper.setClient(getClient());

        // Messages router uchun client ni o'rnatish
        const messagesRouter = require('./web/routes/messages');
        messagesRouter.setTelegramClient(getClient());

        // Monitoring'ni boshlash
        await telegramClient.startMonitoring();
        console.log('✓ Monitoring boshlandi\n');

        // Avtomatik resume - agar to'xtatilgan skanerlash bo'lsa davom ettirish
        const { checkAndResumeScans } = require('./services/autoResume');
        setTimeout(() => {
          logger.info('🔄 Avtomatik resume tekshiruvi boshlandi...');
          checkAndResumeScans().catch(err => logger.error('Auto-resume xatosi:', err));
        }, 15000); // 15 soniya kutish - Telegram client to'liq tayyor bo'lishi uchun
      } else {
        console.error('❌ Telegram client xatosi:', result.error);
        process.exit(1);
      }
    } else {
      console.log('[2/3] LOKAL REJIM (Telegram o\'chirilgan - faqat web dashboard)\n');
    }

    // 3. Web Server
    console.log('[3/3] Web dashboard ishga tushirilmoqda...');
    app.listen(PORT, () => {
      console.log(`✓ Web dashboard: http://localhost:${PORT}`);
      console.log('\n=== Tizim to\'liq ishga tushdi ===\n');

      if (MODE === 'server') {
        console.log('🚀 SERVER REJIM (Telegram va SemySMS yoqilgan)');
      } else if (MODE === 'demo') {
        console.log('📌 DEMO REJIM (Telegram va SemySMS kerak emas)');
      } else {
        console.log('💻 LOKAL REJIM (Faqat web dashboard - Telegram serverda ishlaydi)');
      }

      console.log('\nLogin ma\'lumotlari:');
      console.log('  Username: ' + (process.env.WEB_USERNAME || 'admin'));
      console.log('  Parol: ' + (process.env.WEB_PASSWORD || 'admin123'));
      console.log('\n✨ Browserda oching: http://localhost:' + PORT);

      if (MODE === 'demo') {
        console.log('\n📚 Real ishlatish: REAL_SETUP.md faylini o\'qing');
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Tizim ishga tushirishda xato:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nTizim to\'xtatilmoqda...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nTizim to\'xtatilmoqda...');
  process.exit(0);
});

main();
