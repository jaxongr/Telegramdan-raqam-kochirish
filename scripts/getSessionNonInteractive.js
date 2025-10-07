#!/usr/bin/env node
require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

async function main() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  const phone = process.env.TELEGRAM_PHONE;
  const code = process.env.TELEGRAM_CODE || '';
  const twoFA = process.env.TELEGRAM_2FA_PASSWORD || '';
  const writeEnv = (process.env.WRITE_ENV || 'false').toLowerCase() === 'true';

  if (!apiId || !apiHash || !phone) {
    console.error('Required env missing: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE');
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, { connectionRetries: 5 });

  await client.start({
    phoneNumber: async () => phone,
    password: async () => twoFA,
    phoneCode: async () => code,
    onError: (err) => console.error('Telegram error:', err?.message || err)
  });

  const session = client.session.save();
  console.log('TELEGRAM_SESSION=' + session);

  if (writeEnv) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    try { envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''; } catch (_) {}
    const regex = /^TELEGRAM_SESSION=.*$/m;
    if (regex.test(envContent)) envContent = envContent.replace(regex, 'TELEGRAM_SESSION=' + session);
    else envContent += (envContent.endsWith('\n') || envContent.length === 0 ? '' : '\n') + 'TELEGRAM_SESSION=' + session + '\n';
    fs.writeFileSync(envPath, envContent);
    console.log('.env updated with TELEGRAM_SESSION');
  }

  await client.disconnect();
}

main().catch((e) => {
  console.error('getSessionNonInteractive error:', e?.message || e);
  process.exit(1);
});

