const { query } = require('./src/database/sqlite');

async function updateQashqadaryoRoutes() {
  console.log('🏙️  QASHQADARYO VILOYAT YO\'NALISHLARINI YANGILASH\n');

  // Qashqadaryo viloyat shaharlari (ko'p variant bilan)
  const qashqadaryoCities = [
    'qarshi,karshi,qarsi,қарши,карши',
    'shahrisabz,shaxrisabz,shahrisabiz,shaxrisabiz,шахрисабз,шахрисабиз,шаҳрисабз,шаҳрисабиз',
    'kitob,kitab,китоб,китаб',
    'yakkabog,yakkabog\',yakkabogʻ,яккабог,яккабоғ',
    'guzor,g\'uzor,gʻuzor,гузор,ғузор',
    'koson,kassan,косон,кассан',
    'chiroqchi,chirakchi,чироқчи',
    'dehqonobod,dehkanabad,деҳқонобод,дехканабад',
    'muborak,mubarak,муборак',
    'nishon,nishon,нишон',
    'kamashi,qamashi,камаши,қамаши'
  ].join(',');

  const toshkentKeywords = 'toshkent,tashkent,ташкент,тошкент';

  // Qashqadaryo → Toshkent yo'nalishi
  const route1Name = 'Qashqadaryo → Toshkent';
  const exists1 = await query('SELECT id FROM routes WHERE name = ?', [route1Name]);

  if (exists1.length > 0) {
    // Mavjud yo'nalishni yangilash
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [qashqadaryoCities, toshkentKeywords, route1Name]
    );
    console.log(`✅ Yangilandi: ${route1Name}`);
  } else {
    // Yangi yo'nalish qo'shish
    await query(
      'INSERT INTO routes (name, from_keywords, to_keywords, sms_template, time_window_minutes) VALUES (?, ?, ?, ?, ?)',
      [
        route1Name,
        qashqadaryoCities,
        toshkentKeywords,
        'Assalomu alaykum! Qashqadaryodan Toshkentga yo\'lovchi kerakmi? Tel: {{phone}}',
        120
      ]
    );
    console.log(`✅ Qo'shildi: ${route1Name}`);
  }

  // Toshkent → Qashqadaryo yo'nalishi
  const route2Name = 'Toshkent → Qashqadaryo';
  const exists2 = await query('SELECT id FROM routes WHERE name = ?', [route2Name]);

  if (exists2.length > 0) {
    await query(
      'UPDATE routes SET from_keywords = ?, to_keywords = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
      [toshkentKeywords, qashqadaryoCities, route2Name]
    );
    console.log(`✅ Yangilandi: ${route2Name}`);
  } else {
    await query(
      'INSERT INTO routes (name, from_keywords, to_keywords, sms_template, time_window_minutes) VALUES (?, ?, ?, ?, ?)',
      [
        route2Name,
        toshkentKeywords,
        qashqadaryoCities,
        'Assalomu alaykum! Toshkentdan Qashqadaryoga yo\'lovchi kerakmi? Tel: {{phone}}',
        120
      ]
    );
    console.log(`✅ Qo'shildi: ${route2Name}`);
  }

  console.log('\n📊 Keywords tafsilotlari:');
  console.log('Qashqadaryo shaharlari:', qashqadaryoCities.split(',').length, 'ta variant');
}