#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n=== TELEGRAM SMS TIZIM SOZLASH ===\n');

  // .env faylini tekshirish
  const envPath = path.join(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env fayl mavjud. Qayta yozilsinmi? (ha/yo\'q): ');
    if (overwrite.toLowerCase() !== 'ha' && overwrite.toLowerCase() !== 'y') {
      console.log('Sozlash bekor qilindi.');
      rl.close();
      return;
    }
  }

  console.log('\n--- TELEGRAM API SOZLAMALARI ---');
  console.log('Telegram API key olish uchun: https://my.telegram.org/apps\n');

  const telegramApiId = await question('Telegram API ID: ');
  const telegramApiHash = await question('Telegram API Hash: ');

  console.log('\n--- SEMYSMS API SOZLAMALARI ---');
  console.log('SemySMS API key: https://semysms.net/\n');

  const semysmsApiKey = await question('SemySMS API Key: ');

  console.log('\n--- WEB DASHBOARD SOZLAMALARI ---');

  const webPort = await question('Web port (default: 3000): ') || '3000';
  const webUsername = await question('Admin foydalanuvchi (default: admin): ') || 'admin';
  const webPassword = await question('Admin parol (default: admin123): ') || 'admin123';

  console.log('\n--- DATABASE SOZLAMALARI ---');
  console.log('1. SQLite (recommended - oddiy)');
  console.log('2. PostgreSQL');
  console.log('3. MySQL\n');

  const dbChoice = await question('Tanlov (1-3, default: 1): ') || '1';

  let envContent = `# TELEGRAM API
TELEGRAM_API_ID=${telegramApiId}
TELEGRAM_API_HASH=${telegramApiHash}
TELEGRAM_SESSION_NAME=telegram_session

# DATABASE
`;

  if (dbChoice === '1') {
    envContent += `DATABASE_TYPE=sqlite
DATABASE_PATH=./data/database.sqlite

`;
  } else if (dbChoice === '2') {
    const dbHost = await question('PostgreSQL host (default: localhost): ') || 'localhost';
    const dbPort = await question('PostgreSQL port (default: 5432): ') || '5432';
    const dbName = await question('Database nomi: ');
    const dbUser = await question('Database user: ');
    const dbPass = await question('Database parol: ');

    envContent += `DATABASE_TYPE=postgresql
DATABASE_HOST=${dbHost}
DATABASE_PORT=${dbPort}
DATABASE_NAME=${dbName}
DATABASE_USER=${dbUser}
DATABASE_PASSWORD=${dbPass}

`;
  } else if (dbChoice === '3') {
    const dbHost = await question('MySQL host (default: localhost): ') || 'localhost';
    const dbPort = await question('MySQL port (default: 3306): ') || '3306';
    const dbName = await question('Database nomi: ');
    const dbUser = await question('Database user: ');
    const dbPass = await question('Database parol: ');

    envContent += `DATABASE_TYPE=mysql
DATABASE_HOST=${dbHost}
DATABASE_PORT=${dbPort}
DATABASE_NAME=${dbName}
DATABASE_USER=${dbUser}
DATABASE_PASSWORD=${dbPass}

`;
  }

  envContent += `# SEMYSMS API
SEMYSMS_API_KEY=${semysmsApiKey}

# WEB DASHBOARD
WEB_PORT=${webPort}
WEB_USERNAME=${webUsername}
WEB_PASSWORD=${webPassword}
SESSION_SECRET=${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}

# SYSTEM
NODE_ENV=production
LOG_LEVEL=info
TIMEZONE=Asia/Tashkent

# SMS SETTINGS
SMS_DAILY_LIMIT_PER_NUMBER=2
SMS_DELAY_SECONDS=1
`;

  fs.writeFileSync(envPath, envContent);

  console.log('\n✓ .env fayl yaratildi!');
  console.log('\n--- KEYINGI QADAMLAR ---');
  console.log('1. npm install');
  console.log('2. npm start (yoki npm run pm2:start)');
  console.log('3. Browser: http://localhost:' + webPort);
  console.log('\n=== SOZLASH TUGADI ===\n');

  rl.close();
}

setup().catch(err => {
  console.error('Xato:', err);
  rl.close();
  process.exit(1);
});
