require('dotenv').config();
const telegramClient = require('../src/services/telegramClient');
const fs = require('fs');
const path = require('path');

async function getSessionAndSave() {
  try {
    console.log('🔍 Session olinmoqda...\n');

    const apiId = process.env.TELEGRAM_API_ID;
    const apiHash = process.env.TELEGRAM_API_HASH;
    const phone = process.env.TELEGRAM_PHONE;
    const session = process.env.TELEGRAM_SESSION || '';

    if (!apiId || !apiHash || !phone) {
      console.error('❌ .env faylda Telegram ma\'lumotlari yo\'q!');
      process.exit(1);
    }

    // Telegram client'ga ulanish
    const result = await telegramClient.startTelegramClient(apiId, apiHash, phone, session);

    if (result.success) {
      console.log('✅ Telegram ulanish muvaffaqiyatli!\n');

      const sessionString = result.session;
      console.log('📋 Session string:');
      console.log(sessionString);
      console.log('\n');

      // .env ga yozish
      const envPath = path.join(__dirname, '../.env');
      let envContent = fs.readFileSync(envPath, 'utf8');

      const regex = /^TELEGRAM_SESSION=.*$/m;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `TELEGRAM_SESSION=${sessionString}`);
      } else {
        envContent = envContent.replace(/^TELEGRAM_SESSION=$/m, `TELEGRAM_SESSION=${sessionString}`);
      }

      fs.writeFileSync(envPath, envContent);
      console.log('✅ Session .env faylga saqlandi!');
      console.log('\n🎉 Endi `npm start` buyrug\'i bilan to\'liq ishga tushirish mumkin!\n');

      process.exit(0);
    } else {
      console.error('❌ Xatolik:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

getSessionAndSave();
