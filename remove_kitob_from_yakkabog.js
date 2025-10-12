/**
 * YAKKABOG' KALIT SO'ZLARIDAN "KITOB" NI OLIB TASHLASH
 * Kitob endi alohida yo'nalish, shuning uchun Yakkabog'da bo'lmasligi kerak
 */

const { query } = require('./src/database/sqlite');

async function removeKitobFromYakkabog() {
  console.log('YAKKABOG KALIT SOZLARIDAN "KITOB" NI OLIB TASHLASH...\n');

  try {
    // Yakkabog' route ni olish
    const yakkabog = await query('SELECT id, from_keywords FROM routes WHERE id = 2397');

    if (!yakkabog || yakkabog.length === 0) {
      console.log('⚠️  Yakkabog route topilmadi (ID 2397)');
      process.exit(1);
    }

    const oldKeywords = yakkabog[0].from_keywords || yakkabog[0].FROM_KEYWORDS;

    console.log('Oldingi kalit sozlar:');
    console.log(oldKeywords);
    console.log('');

    // 'kitob' sozlarini olib tashlash
    const keywords = oldKeywords.split(',').map(k => k.trim());
    const filteredKeywords = keywords.filter(k => {
      const lower = k.toLowerCase();
      return !lower.startsWith('kitob') &&
             !lower.startsWith('китоб') &&
             !lower.startsWith('kітоб') &&
             !lower.startsWith('qitob');
    });

    const newKeywords = filteredKeywords.join(',');

    console.log('Yangi kalit sozlar:');
    console.log(newKeywords);
    console.log('');

    // Yangilash
    await query('UPDATE routes SET from_keywords = ? WHERE id = 2397', [newKeywords]);

    console.log('✅ Yakkabog kalit sozlaridan "kitob" olib tashlandi!');
    console.log('   Olib tashlangan: ' + (keywords.length - filteredKeywords.length) + ' ta kalit soz');
    console.log('\nEndi "Kitobdan" elonlar faqat Kitob (2401) yonalishiga boradi.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

removeKitobFromYakkabog();
