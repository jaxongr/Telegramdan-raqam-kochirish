require('dotenv').config();
const { initDatabase } = require('./database');
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
    console.log('✓ Database tayyor\n');

    // 2. Telegram Client (agar production mode bo'lsa)
    if (MODE === 'production') {
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

        // Monitoring'ni boshlash
        await telegramClient.startMonitoring();
        console.log('✓ Monitoring boshlandi\n');
      } else {
        console.error('❌ Telegram client xatosi:', result.error);
        process.exit(1);
      }
    } else {
      console.log('[2/3] DEMO REJIM (Telegram o\'chirilgan)\n');
    }

    // 3. Web Server
    console.log('[3/3] Web dashboard ishga tushirilmoqda...');
    app.listen(PORT, () => {
      console.log(`✓ Web dashboard: http://localhost:${PORT}`);
      console.log('\n=== Tizim to\'liq ishga tushdi ===\n');

      if (MODE === 'demo') {
        console.log('📌 DEMO REJIM (Telegram va SemySMS kerak emas)');
      } else {
        console.log('🚀 PRODUCTION REJIM (Real Telegram va SemySMS)');
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
