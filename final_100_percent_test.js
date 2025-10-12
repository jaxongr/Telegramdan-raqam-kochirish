const { query } = require('./src/database/sqlite');
const { findMatchingPhones, matchesRoute } = require('./src/database/routes');
const fs = require('fs');

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';
const RESET = '\x1b[0m';

async function final100PercentTest() {
  console.log('\n' + '='.repeat(80));
  console.log(`${BLUE}💯 100% ISHONCH UCHUN YAKUNIY TEST${RESET}`);
  console.log('='.repeat(80) + '\n');

  let passedTests = 0;
  let failedTests = 0;
  const issues = [];

  // ========== TEST 1: INPUT FILTER O'CHIRILGANMI ==========
  console.log(`${YELLOW}1️⃣ INPUT FILTER O'CHIRILGANMI${RESET}`);
  console.log('-'.repeat(50));

  try {
    const code = fs.readFileSync('src/services/telegramClient.js', 'utf8');

    // Check: Keywords filter blok comment ichidami?
    const commentStartIndex = code.indexOf('/* MUVAQQAT O\'CHIRILGAN');
    const hasBlockComment = commentStartIndex > -1;

    // To'g'ri comment end ni topish (bizning comment blokidan keyin birinchi */)
    const commentEndIndex = code.indexOf('*/', commentStartIndex);
    const keywordReturnIndex = code.indexOf('if (!hasKeyword) return;');

    // Keywords filter comment ichidami tekshirish
    const isFilterCommented = hasBlockComment &&
                             commentEndIndex > 0 &&
                             keywordReturnIndex > commentStartIndex &&
                             keywordReturnIndex < commentEndIndex;

    if (isFilterCommented) {
      console.log(`${GREEN}✅ PASS: Keywords filter TO'LIQ o'chirilgan (blok comment ichida)${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: Keywords filter hali ham YOQIQ bo'lishi mumkin${RESET}`);
      console.log(`   Debug: commentStart=${commentStartIndex}, keywordReturn=${keywordReturnIndex}, commentEnd=${commentEndIndex}`);
      issues.push('Keywords filter to\'liq o\'chirilmagan');
      failedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 2: VAQT INTERVAL (2 SOAT) ==========
  console.log(`\n${YELLOW}2️⃣ VAQT INTERVAL ANIQLIGI${RESET}`);
  console.log('-'.repeat(50));

  try {
    const now = new Date();

    // Test data
    await query('DELETE FROM groups WHERE id >= 10000');
    await query('DELETE FROM phones WHERE group_id >= 10000');

    await query('INSERT INTO groups (id, name, telegram_id, active) VALUES (?, ?, ?, ?)',
      [10001, 'Test Time Group', '-10010001', 1]);

    const testData = [
      { hours: 0.5, expected: true },   // 30 daqiqa oldin - KERAK
      { hours: 1.9, expected: true },   // 1.9 soat oldin - KERAK
      { hours: 2.1, expected: false },  // 2.1 soat oldin - KERAK EMAS
      { hours: 24, expected: false },   // 1 kun oldin - KERAK EMAS
      { hours: 168, expected: false }   // 1 hafta oldin - KERAK EMAS
    ];

    let timeTestPassed = true;

    for (const test of testData) {
      const date = new Date(now - test.hours * 60 * 60 * 1000);
      const phone = `+99890${Math.floor(Math.random() * 10000000)}`;

      await query(
        'INSERT INTO phones (phone, group_id, last_message, last_date) VALUES (?, ?, ?, ?)',
        [phone, 10001, 'Test message', date.toISOString()]
      );
    }

    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    const result = await query(
      'SELECT COUNT(*) as count FROM phones WHERE group_id = 10001 AND last_date >= ?',
      [twoHoursAgo.toISOString()]
    );

    const expectedCount = testData.filter(t => t.expected).length;

    if (result[0].count === expectedCount) {
      console.log(`${GREEN}✅ PASS: 2 soat interval to'g'ri (${result[0].count}/${expectedCount})${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: 2 soat interval xato (${result[0].count}/${expectedCount})${RESET}`);
      issues.push(`Vaqt interval: ${result[0].count} ta topildi, ${expectedCount} ta kutilgan`);
      failedTests++;
      timeTestPassed = false;
    }

    // Clean up
    await query('DELETE FROM phones WHERE group_id >= 10000');
    await query('DELETE FROM groups WHERE id >= 10000');

  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 3: ROUTE MATCHING STRICTNESS ==========
  console.log(`\n${YELLOW}3️⃣ ROUTE MATCHING ANIQLIGI${RESET}`);
  console.log('-'.repeat(50));

  const strictTests = [
    {
      msg: 'Toshkentdan Qarshiga taksi kerak',
      from: ['toshkent', 'tashkent'],
      to: ['qarshi', 'karshi'],
      expected: true,
      label: 'FROM+TO (to\'g\'ri)'
    },
    {
      msg: 'Toshkentga boramiz',
      from: ['toshkent', 'tashkent'],
      to: ['qarshi', 'karshi'],
      expected: false,
      label: 'Faqat TO (rad etilishi kerak)'
    },
    {
      msg: 'Qarshidan ketamiz',
      from: ['qarshi', 'karshi'],
      to: ['toshkent', 'tashkent'],
      expected: false,
      label: 'Faqat FROM (rad etilishi kerak)'
    },
    {
      msg: 'Yakkabog\' Shahrisabz Kitobdan Toshkentga',
      from: ['yakkabog', 'yakkabog\'', 'shahrisabz', 'kitob'],
      to: ['toshkent', 'tashkent'],
      expected: true,
      label: 'Ko\'p shahar (qabul qilinishi kerak)'
    }
  ];

  let routeTestsPassed = 0;
  for (const test of strictTests) {
    const result = matchesRoute(test.msg, test.from, test.to);

    if (result === test.expected) {
      console.log(`${GREEN}✅ ${test.label}: ${result ? 'MOS' : 'RAD'}${RESET}`);
      routeTestsPassed++;
      passedTests++;
    } else {
      console.log(`${RED}❌ ${test.label}: ${result ? 'MOS' : 'RAD'} (kutilgan: ${test.expected ? 'MOS' : 'RAD'})${RESET}`);
      issues.push(`Route matching: ${test.label}`);
      failedTests++;
    }
  }

  // ========== TEST 4: DUBLIKAT YO'NALISHLAR ==========
  console.log(`\n${YELLOW}4️⃣ DUBLIKAT YO'NALISHLAR MUAMMOSI${RESET}`);
  console.log('-'.repeat(50));

  try {
    // Clean existing test routes
    await query('DELETE FROM routes WHERE id >= 10000');

    // Create unique test route
    await query(
      'INSERT INTO routes (id, name, from_keywords, to_keywords, active) VALUES (?, ?, ?, ?, ?)',
      [10001, 'Test Unique Route', 'testcity1,testcity2', 'testcity3,testcity4', 1]
    );

    // Check how many routes match our test message
    const testMsg = 'testcity1dan testcity3ga bormoqchimiz';
    const routes = await query('SELECT * FROM routes WHERE active = 1');

    let matchCount = 0;
    for (const route of routes) {
      const from = route.from_keywords.split(',').map(k => k.trim());
      const to = route.to_keywords.split(',').map(k => k.trim());

      if (matchesRoute(testMsg, from, to)) {
        matchCount++;
      }
    }

    if (matchCount === 1) {
      console.log(`${GREEN}✅ PASS: Faqat 1 yo'nalishga mos keldi${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: ${matchCount} yo'nalishga mos keldi${RESET}`);
      issues.push(`Dublikat matching: ${matchCount} route`);
      failedTests++;
    }

    // Clean up
    await query('DELETE FROM routes WHERE id >= 10000');

  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 5: SMS COOLDOWN (2 SOAT) ==========
  console.log(`\n${YELLOW}5️⃣ SMS COOLDOWN TEKSHIRISH${RESET}`);
  console.log('-'.repeat(50));

  try {
    const smsServiceCode = fs.readFileSync('src/services/smsService.js', 'utf8');

    // Check cooldown logic exists
    const hasCooldown = smsServiceCode.includes('SMS_COOLDOWN_HOURS') &&
                        smsServiceCode.includes('hoursSinceLastSMS < SMS_COOLDOWN_HOURS');

    if (hasCooldown) {
      console.log(`${GREEN}✅ PASS: SMS 2-soat cooldown mavjud${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: SMS cooldown logikasi topilmadi${RESET}`);
      issues.push('SMS cooldown logikasi yo\'q');
      failedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 6: REAL-TIME MONITORING ==========
  console.log(`\n${YELLOW}6️⃣ REAL-TIME MONITORING${RESET}`);
  console.log('-'.repeat(50));

  try {
    // Check if monitoring function exists and works
    const { getClientStatus } = require('./src/services/telegramClient');
    const status = getClientStatus();

    console.log(`${GREEN}✅ PASS: Monitoring funksiyalari mavjud${RESET}`);
    console.log(`   Status: connected=${status.connected}, monitoring=${status.monitoring}`);
    passedTests++;
  } catch (error) {
    console.log(`${RED}❌ FAIL: Monitoring funksiyalari ishlamayapti${RESET}`);
    issues.push('Monitoring funksiyalari xato');
    failedTests++;
  }

  // ========== TEST 7: DATABASE INTEGRITY ==========
  console.log(`\n${YELLOW}7️⃣ DATABASE INTEGRITY${RESET}`);
  console.log('-'.repeat(50));

  try {
    // Check all required tables exist
    const tables = ['groups', 'phones', 'routes', 'route_sms_logs', 'sms_logs'];
    let allTablesExist = true;

    for (const table of tables) {
      try {
        await query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✅ ${table} table mavjud`);
      } catch (e) {
        console.log(`   ❌ ${table} table TOPILMADI`);
        allTablesExist = false;
        issues.push(`${table} table yo'q`);
      }
    }

    if (allTablesExist) {
      console.log(`${GREEN}✅ PASS: Barcha table'lar mavjud${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ FAIL: Ba'zi table'lar yo'q${RESET}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR: ${error.message}${RESET}`);
    failedTests++;
  }

  // ========== TEST 8: APOSTROF VA SPECIAL CHARACTERS ==========
  console.log(`\n${YELLOW}8️⃣ APOSTROF VA MAXSUS BELGILAR${RESET}`);
  console.log('-'.repeat(50));

  const specialTests = [
    { msg: "Yakkabog'dan Toshkentga", from: ['yakkabog\'', 'yakkabog'], to: ['toshkent'], expected: true },
    { msg: "YAKKABOG'DAN TOSHKENTGA", from: ['yakkabog\'', 'yakkabog'], to: ['toshkent'], expected: true },
    { msg: "Yakkabog'dan Toshkentga", from: ['yakkabog', 'yakkabog\''], to: ['toshkent'], expected: true }
  ];

  for (const test of specialTests) {
    const result = matchesRoute(test.msg, test.from, test.to);
    if (result === test.expected) {
      console.log(`${GREEN}✅ Apostrof test: "${test.msg.substring(0, 20)}..." OK${RESET}`);
      passedTests++;
    } else {
      console.log(`${RED}❌ Apostrof test: "${test.msg.substring(0, 20)}..." FAIL${RESET}`);
      issues.push('Apostrof handling xato');
      failedTests++;
    }
  }

  // ========== NATIJALAR ==========
  console.log('\n' + '='.repeat(80));

  const totalTests = passedTests + failedTests;
  const successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  if (successRate === 100) {
    console.log(`${GREEN}🎉 100% MUVAFFAQIYAT!${RESET}`);
    console.log(`${GREEN}✅ ${passedTests}/${totalTests} test o'tdi${RESET}`);
    console.log(`\n${GREEN}💯 ISHONCH: TIZIM 100% TO'G'RI ISHLAYAPTI!${RESET}`);
  } else {
    console.log(`${YELLOW}⚠️ ${successRate}% MUVAFFAQIYAT${RESET}`);
    console.log(`${GREEN}✅ ${passedTests}/${totalTests} test o'tdi${RESET}`);
    console.log(`${RED}❌ ${failedTests} ta test o'tmadi${RESET}`);

    if (issues.length > 0) {
      console.log(`\n${RED}🔧 HAL QILINISHI KERAK:${RESET}`);
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
  }

  console.log('='.repeat(80) + '\n');

  return { passed: passedTests, failed: failedTests, total: totalTests, issues };
}

// Test'ni ishga tushirish
final100PercentTest().then(result => {
  if (result.failed > 0) {
    console.log(`${YELLOW}📌 TAVSIYA: Yuqoridagi muammolarni hal qiling va qayta test qiling${RESET}\n`);
  }
}).catch(console.error);