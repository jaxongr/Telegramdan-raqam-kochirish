// Telegram session olish uchun yordamchi script
require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');

async function getSession() {
  const apiId = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  const phone = process.env.TELEGRAM_PHONE;

  console.log('\n=== Telegram Session Olish ===\n');
  console.log('API ID:', apiId);
  console.log('Phone:', phone);
  console.log('\n');

  const stringSession = new StringSession(''); // Bo'sh session
  const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => phone,
    password: async () => await input.text('Parol (2FA - bo\'lmasa Enter): '),
    phoneCode: async () => await input.text('Telegram SMS kod: '),
    onError: (err) => console.error('Xato:', err),
  });

  const session = client.session.save();

  console.log('\n\n=== SESSION TAYYOR ===\n');
  console.log(session);
  console.log('\n\n.env fayliga qo\'shing:');
  console.log('TELEGRAM_SESSION=' + session);
  console.log('\n');

  await client.disconnect();
  process.exit(0);
}

getSession().catch(console.error);
