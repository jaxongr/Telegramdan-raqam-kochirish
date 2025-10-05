const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const fs = require('fs');
require('dotenv').config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION;

(async () => {
  console.log('🔌 Asosiy akkaunt guruhlari tekshirilmoqda...\n');

  const client = new TelegramClient(
    new StringSession(sessionString),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.connect();
  console.log('✅ Ulandi: ' + process.env.TELEGRAM_PHONE + '\n');

  const dialogs = await client.getDialogs({ limit: 500 });

  const groups = dialogs.filter(d =>
    d.isGroup || d.isChannel
  );

  console.log(`=== ${groups.length} TA GURUH TOPILDI ===\n`);

  const logistics = [];

  groups.forEach((g, i) => {
    const title = g.title || g.name || 'Unknown';
    const id = g.id?.value || g.id;
    const lowerTitle = title.toLowerCase();

    // Logistics keywords
    const isLogistics =
      lowerTitle.includes('yuk') ||
      lowerTitle.includes('cargo') ||
      lowerTitle.includes('logist') ||
      lowerTitle.includes('transport') ||
      lowerTitle.includes('груз') ||
      lowerTitle.includes('perevoz') ||
      lowerTitle.includes('dispecher');

    if (isLogistics) {
      logistics.push({ title, id });
      console.log(`${logistics.length}. ${title}`);
      console.log(`   ID: ${id}`);
    }
  });

  console.log(`\n=== JAMI: ${logistics.length} TA LOGISTICS GURUH ===\n`);

  // IDs ni chiqarish
  console.log('TELEGRAM IDs (vergul bilan):');
  console.log(logistics.map(g => g.id).join(','));

  await client.disconnect();
})();
