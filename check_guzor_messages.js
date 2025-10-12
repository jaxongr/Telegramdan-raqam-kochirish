/**
 * G'UZOR VA QAMASHI XABARLARINI TEKSHIRISH
 */

const { query } = require('./src/database/sqlite');

async function checkGuzorMessages() {
  try {
    console.log('\n=== TELEGRAM GURUHLARDAN G\'UZOR XABARLARI ===\n');

    // G'uzor xabarlari
    const guzorCount = await query("SELECT COUNT(*) as cnt FROM phones WHERE last_message LIKE '%guzor%' OR last_message LIKE '%g%uzor%' OR last_message LIKE '%ғузор%' OR last_message LIKE '%гузор%'");
    console.log('Jami G\'uzor xabarlari:', guzorCount[0].cnt || guzorCount[0].CNT);

    console.log('\nOXIRGI 10 TA G\'UZOR XABARI:\n');
    const guzorSamples = await query("SELECT last_message FROM phones WHERE last_message LIKE '%guzor%' OR last_message LIKE '%g%uzor%' ORDER BY last_date DESC LIMIT 10");

    guzorSamples.forEach((m, i) => {
      const text = (m.last_message || m.LAST_MESSAGE || '').substring(0, 200).replace(/\n/g, ' | ');
      console.log(`${i + 1}. ${text}...\n`);
    });

    // Qamashi xabarlari
    console.log('\n=== QAMASHI XABARLARI ===\n');
    const qamashiCount = await query("SELECT COUNT(*) as cnt FROM phones WHERE last_message LIKE '%qamashi%' OR last_message LIKE '%kamashi%' OR last_message LIKE '%камаши%' OR last_message LIKE '%қамаши%'");
    console.log('Jami Qamashi xabarlari:', qamashiCount[0].cnt || qamashiCount[0].CNT);

    console.log('\nOXIRGI 5 TA QAMASHI XABARI:\n');
    const qamashiSamples = await query("SELECT last_message FROM phones WHERE last_message LIKE '%qamashi%' OR last_message LIKE '%kamashi%' ORDER BY last_date DESC LIMIT 5");

    qamashiSamples.forEach((m, i) => {
      const text = (m.last_message || m.LAST_MESSAGE || '').substring(0, 200).replace(/\n/g, ' | ');
      console.log(`${i + 1}. ${text}...\n`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Xato:', error.message);
    process.exit(1);
  }
}

checkGuzorMessages();
