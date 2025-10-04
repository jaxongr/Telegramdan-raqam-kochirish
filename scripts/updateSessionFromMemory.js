// Bu script - ishlab turgan ilovadan session olish uchun
// Faqat telegramClient xotirasida session saqlangan bo'lsa ishlaydi

const fs = require('fs');
const path = require('path');

// Log fayldan session ni izlash
const logFile = path.join(__dirname, '../logs/app-2025-10-05.log');
const logContent = fs.readFileSync(logFile, 'utf8');

// Session qatorini topish
const sessionMatch = logContent.match(/Session \(to'liq\): (.+)/);

if (sessionMatch && sessionMatch[1]) {
  const sessionString = sessionMatch[1].trim();

  console.log('✅ Session topildi!');
  console.log('Uzunligi:', sessionString.length);

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
  console.log('✅ Session .env faylga yozildi!');

} else {
  console.log('❌ Session topilmadi. Ilovani qayta ishga tushiring.');
}
