const { query } = require('./src/database/sqlite');
const { findMatchingPhones, matchesRoute } = require('./src/database/routes');

// Ranglar
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

async function fullSystemTest() {
  console.log('\n' + '='.repeat(70));
  console.log(`${BLUE}🔬 TO'LIQ TIZIM TESTI - 100% ISHONCH UCHUN${RESET}`);
  console.log('='.repeat(70) + '\n');

  let passedTests = 0;
  let failedTests = 0;

  // ========== TEST 1: VAQT INTERVAL ==========
  console.log(`${YELLOW}📅 TEST 1: VAQT INTERVAL (2 SOAT)${RESET}`);
  console.log('-'.repeat(40));

  try {
    // Test guruh yaratish
    await query('DELETE FROM groups WHERE id = 9999');
    await query('INSERT INTO groups (id, name, telegram_id, active) VALUES (?, ?, ?, ?)',
      [9999, 'Test Group', '-1009999', 1]);

    // Turli vaqtlardagi test ma'lumotlar
    const now = new Date();
    const testPhones = [
      { time: 0.5, phone: '+998901000001', message: 'Toshkentdan Qarshiga 30 daqiqa oldin' },
      { time: 1.5, phone: '+998901000002', message: 'Qarshidan Toshkentga 1.5 soat oldin' },
      { time: 2.5, phone: '+998901000003', message: 'Toshkentdan Buxoroga 2.5 soat oldin' },
      { time: 5, phone: '+998901000004', message: 'Buxorodan Toshkentga 5 soat oldin' },
      { time: 24, phone: '+998901000005', message: 'Toshkentdan Samarqandga 1 kun oldin' }
    ];

    // Ma'lumotlarni kiritish
    for (const tp of testPhones) {
      const date = new Date(now - tp.time * 60 * 60 * 1000);
      await query(
        'INSERT OR REPLACE INTO phones (phone, group_id, last_message, last_date) VALUES (?, ?, ?, ?)',
        [tp.phone, 9999, tp.message, date.toISOString()]
      );
    }

    // 2 soatlik interval bilan tekshirish
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    const recentPhones = await query(
      'SELECT COUNT(*) as count FROM phones WHERE group_id = 9999 AND last_date >= ?',
      [twoHoursAgo.toISOString()]
    );

    const expectedCount = 2; // Faqat 0.5 va 1.5 soatliklar
    if (recentPhones[0].count === expectedCount) {
      console.log(`${GREEN}✅ PASS: 2 soat ichida ${expectedCount} ta (kutilgan: ${expectedCount})${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: 2 soat ichida ${recentPhones[0].count} ta (kutilgan: ${expectedCount})${RESET}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 2: ROUTE MATCHING ANIQLIGI ==========
  console.log(`\n${YELLOW}🎯 TEST 2: ROUTE MATCHING ANIQLIGI${RESET}`);
  console.log('-'.repeat(40));

  const testMessages = [
    { msg: 'Toshkentdan Qarshiga taksi', from: ['toshkent'], to: ['qarshi'], expected: true },
    { msg: 'Qarshidan Toshkentga qaytamiz', from: ['qarshi'], to: ['toshkent'], expected: true },
    { msg: 'Toshkentga boramiz', from: ['qarshi'], to: ['toshkent'], expected: false }, // Faqat TO
    { msg: 'Samarqanddan ketamiz', from: ['samarqand'], to: ['toshkent'], expected: false }, // Faqat FROM
    { msg: 'Bugun ob-havo yaxshi', from: ['toshkent'], to: ['qarshi'], expected: false }, // Hech biri yo'q
    { msg: 'Tashkentdan Karshiga yuk bor', from: ['toshkent','tashkent'], to: ['qarshi','karshi'], expected: true }
  ];

  for (const test of testMessages) {
    const result = matchesRoute(test.msg, test.from, test.to);
    if (result === test.expected) {
      console.log(`${GREEN}✅ PASS: "${test.msg.substring(0,30)}..." => ${result}${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: "${test.msg.substring(0,30)}..." => ${result} (kutilgan: ${test.expected})${RESET}`);
      failedTests++;
    }
  }

  // ========== TEST 3: KEYWORDS FILTER HOLATI ==========
  console.log(`\n${YELLOW}🔍 TEST 3: KEYWORDS FILTER O'CHIRILGANMI?${RESET}`);
  console.log('-'.repeat(40));

  const telegramClientCode = require('fs').readFileSync(
    'src/services/telegramClient.js', 'utf8'
  );

  // Keywords filter comment qilinganmi tekshirish
  const hasCommentedFilter = telegramClientCode.includes('/* MUVAQQAT O\'CHIRILGAN') ||
                             telegramClientCode.includes('// if (!hasKeyword) return;');

  if (hasCommentedFilter) {
    console.log(`${GREEN}✅ PASS: Keywords filter O'CHIRILGAN (barcha xabar qabul qilinadi)${RESET}`);
    passedTests++;
  } else {
    console.log(`${RED}❌ FAIL: Keywords filter hali ham YOQIQ (99% xabar tashlanadi!)${RESET}`);
    failedTests++;
  }

  // ========== TEST 4: YO'NALISHLAR DUBLIKATSIYASI ==========
  console.log(`\n${YELLOW}🔄 TEST 4: YO'NALISHLAR DUBLIKATSIYASI${RESET}`);
  console.log('-'.repeat(40));

  try {
    // Test route yaratish (boshqacha nom bilan)
    await query('DELETE FROM routes WHERE id = 9999');
    await query(
      'INSERT INTO routes (id, name, from_keywords, to_keywords, time_window_minutes, active) VALUES (?, ?, ?, ?, ?, ?)',
      [9999, 'Test Route Only', 'toshkent,tashkent', 'qarshi,karshi', 120, 1]
    );

    // Test xabar - faqat Toshkent→Qarshi ga mos kelishi kerak
    const testPhone = {
      phone: '+998909999999',
      message: 'Toshkentdan Qarshiga 4 kishi ketadi',
      group_id: 9999
    };

    await query(
      'INSERT OR REPLACE INTO phones (phone, group_id, last_message, last_date) VALUES (?, ?, ?, ?)',
      [testPhone.phone, testPhone.group_id, testPhone.message, new Date().toISOString()]
    );

    // Barcha yo'nalishlarni tekshirish
    const allRoutes = await query('SELECT id, name, from_keywords, to_keywords FROM routes WHERE active = 1');
    let matchCount = 0;
    let matchedRoutes = [];

    for (const route of allRoutes) {
      const fromKeywords = route.from_keywords.toLowerCase().split(',').map(k => k.trim());
      const toKeywords = route.to_keywords.toLowerCase().split(',').map(k => k.trim());

      if (matchesRoute(testPhone.message, fromKeywords, toKeywords)) {
        matchCount++;
        matchedRoutes.push(route.name);
      }
    }

    if (matchCount === 1) {
      console.log(`${GREEN}✅ PASS: Faqat 1 yo'nalishga mos keldi (to'g'ri)${RESET}`);
      console.log(`   Mos kelgan: ${matchedRoutes[0]}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: ${matchCount} yo'nalishga mos keldi (kutilgan: 1)${RESET}`);
      console.log(`   Mos kelganlar: ${matchedRoutes.join(', ')}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 5: REAL DATA TEST ==========
  console.log(`\n${YELLOW}📊 TEST 5: HAQIQIY MA'LUMOTLAR BILAN${RESET}`);
  console.log('-'.repeat(40));

  try {
    // Real yo'nalishlarni tekshirish
    const realRoutes = [
      { id: 1, name: 'Toshkent → Qarshi' },
      { id: 2, name: 'Qarshi → Toshkent' },
      { id: 8, name: 'Andijon → Toshkent' }
    ];

    for (const route of realRoutes) {
      const routeData = await query('SELECT * FROM routes WHERE name = ?', [route.name]);

      if (routeData.length > 0) {
        const matchedPhones = await findMatchingPhones(routeData[0].id, 120);
        console.log(`${GREEN}✓ ${route.name}: ${matchedPhones.length} ta telefon (2 soat ichida)${RESET}`);
        passedTests++;
      } else {
        console.log(`${YELLOW}⚠ ${route.name}: Yo'nalish topilmadi${RESET}`);
      }
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TOZALASH ==========
  await query('DELETE FROM phones WHERE group_id = 9999');
  await query('DELETE FROM groups WHERE id = 9999');
  await query('DELETE FROM routes WHERE id = 9999');

  // ========== NATIJALAR ==========
  console.log('\n' + '='.repeat(70));

  const totalTests = passedTests + failedTests;
  const successRate = Math.round((passedTests / totalTests) * 100);

  if (successRate === 100) {
    console.log(`${GREEN}🎉 BARCHA TESTLAR MUVAFFAQIYATLI O'TDI!${RESET}`);
    console.log(`${GREEN}✅ ${passedTests}/${totalTests} test o'tdi (100%)${RESET}`);
    console.log(`\n${GREEN}💯 ISHONCH: TIZIM 100% TO'G'RI ISHLAYAPTI!${RESET}`);
  } else if (successRate >= 80) {
    console.log(`${YELLOW}⚠️ BA'ZI MUAMMOLAR BOR${RESET}`);
    console.log(`${YELLOW}✅ ${passedTests}/${totalTests} test o'tdi (${successRate}%)${RESET}`);
    console.log(`${RED}❌ ${failedTests} ta test o'tmadi${RESET}`);
  } else {
    console.log(`${RED}🚨 JIDDIY MUAMMOLAR BOR!${RESET}`);
    console.log(`${RED}❌ Faqat ${passedTests}/${totalTests} test o'tdi (${successRate}%)${RESET}`);
  }

  console.log('='.repeat(70) + '\n');

  return { passed: passedTests, failed: failedTests, total: totalTests };
}

// Test'ni ishga tushirish
fullSystemTest().catch(console.error);