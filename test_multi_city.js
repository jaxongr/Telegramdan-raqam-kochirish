const { query } = require('./src/database/sqlite');
const { matchesRoute } = require('./src/database/routes');

async function testMultiCity() {
  console.log('\n' + '='.repeat(70));
  console.log('🏙️  KO\'P SHAHARLI E\'LON TEST');
  console.log('='.repeat(70) + '\n');

  // Test xabar - sizning misolingiz
  const testMessage = "YAKKABOG' SHAXRISABZ KITOBDAN TOSHKENTGA 3 KISHI KERAK";
  console.log('📨 TEST XABAR:');
  console.log(`"${testMessage}"\n`);

  // Qashqadaryo shaharlari
  const qashqadaryoCities = [
    'yakkabog',
    'yakkabog\'',
    'shahrisabz',
    'shaxrisabz',
    'kitob',
    'kitab',
    'qarshi',
    'guzor',
    'koson',
    'chiroqchi',
    'dehqonobod',
    'muborak',
    'nishon',
    'kamashi'
  ];

  const toshkentKeywords = ['toshkent', 'tashkent'];

  console.log('🔍 MATCHING TEST:\n');
  console.log('FROM keywords (Qashqadaryo):', qashqadaryoCities.join(', '));
  console.log('TO keywords:', toshkentKeywords.join(', '));
  console.log('-'.repeat(50));

  // 1. QASHQADARYO → TOSHKENT yo'nalishi
  console.log('\n1️⃣  Qashqadaryo → Toshkent yo\'nalishi:');
  const match1 = matchesRoute(testMessage, qashqadaryoCities, toshkentKeywords);
  console.log(`   Natija: ${match1 ? '✅ MOS KELDI!' : '❌ Mos kelmadi'}`);

  if (match1) {
    // Qaysi shaharlar topildi?
    const foundCities = qashqadaryoCities.filter(city =>
      testMessage.toLowerCase().replace(/['`']/g, "'").includes(city.toLowerCase())
    );
    console.log(`   Topilgan shaharlar: ${foundCities.join(', ')}`);
  }

  // 2. INDIVIDUAL TEST - har bir shaharni alohida tekshirish
  console.log('\n2️⃣  Alohida shaharlar bo\'yicha:');

  // Yakkabog' → Toshkent
  const match2 = matchesRoute(testMessage, ['yakkabog', 'yakkabog\''], toshkentKeywords);
  console.log(`   Yakkabog\' → Toshkent: ${match2 ? '✅ MOS' : '❌ Mos emas'}`);

  // Shahrisabz → Toshkent
  const match3 = matchesRoute(testMessage, ['shahrisabz', 'shaxrisabz'], toshkentKeywords);
  console.log(`   Shahrisabz → Toshkent: ${match3 ? '✅ MOS' : '❌ Mos emas'}`);

  // Kitob → Toshkent
  const match4 = matchesRoute(testMessage, ['kitob', 'kitab'], toshkentKeywords);
  console.log(`   Kitob → Toshkent: ${match4 ? '✅ MOS' : '❌ Mos emas'}`);

  // Qarshi → Toshkent (bu xabarda Qarshi yo'q)
  const match5 = matchesRoute(testMessage, ['qarshi', 'karshi'], toshkentKeywords);
  console.log(`   Qarshi → Toshkent: ${match5 ? '✅ MOS' : '❌ Mos emas'} (kutilgan: mos emas)`);

  // 3. BOSHQA TEST XABARLAR
  console.log('\n3️⃣  Boshqa test xabarlar:');

  const testCases = [
    {
      msg: "QARSHIDAN TOSHKENTGA 5 KISHI",
      from: qashqadaryoCities,
      to: toshkentKeywords,
      expected: true,
      label: "Qarshidan Toshkentga"
    },
    {
      msg: "TOSHKENTDAN YAKKABOG'GA YUK BOR",
      from: toshkentKeywords,
      to: qashqadaryoCities,
      expected: true,
      label: "Toshkentdan Yakkabog'ga"
    },
    {
      msg: "KITOB SHAHRISABZ DEHQONOBOD MUBORAKDAN TOSHKENTGA",
      from: qashqadaryoCities,
      to: toshkentKeywords,
      expected: true,
      label: "Ko'p shahar → Toshkent"
    },
    {
      msg: "ANDIJONDAN FARG'ONAGA",
      from: qashqadaryoCities,
      to: toshkentKeywords,
      expected: false,
      label: "Boshqa viloyat (mos kelmasligi kerak)"
    }
  ];

  for (const test of testCases) {
    const result = matchesRoute(test.msg, test.from, test.to);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${status} ${test.label}: ${result ? 'MOS' : 'Mos emas'}`);
  }

  // 4. DATABASE'GA SAQLASH VA REAL TEST
  console.log('\n4️⃣  Database test:');

  try {
    // Qashqadaryo yo'nalishini yaratish yoki yangilash
    await query('DELETE FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);

    await query(
      'INSERT INTO routes (name, from_keywords, to_keywords, time_window_minutes, active) VALUES (?, ?, ?, ?, ?)',
      [
        'Qashqadaryo → Toshkent',
        qashqadaryoCities.join(','),
        toshkentKeywords.join(','),
        120,
        1
      ]
    );
    console.log('   ✅ Yo\'nalish yaratildi');

    // Test telefon qo'shish
    await query('DELETE FROM phones WHERE phone = ?', ['+998991234567']);
    await query('DELETE FROM groups WHERE id = 8888');
    await query('INSERT INTO groups (id, name, telegram_id, active) VALUES (?, ?, ?, ?)',
      [8888, 'Test Group', '-1008888', 1]);

    await query(
      'INSERT INTO phones (phone, group_id, last_message, last_date) VALUES (?, ?, ?, ?)',
      ['+998991234567', 8888, testMessage, new Date().toISOString()]
    );
    console.log('   ✅ Test telefon qo\'shildi');

    // Yo'nalishga mos keluvchilarni topish
    const { findMatchingPhones } = require('./src/database/routes');
    const route = await query('SELECT * FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);

    if (route.length > 0) {
      const matchedPhones = await findMatchingPhones(route[0].id, 120);
      console.log(`   ✅ Topilgan telefonlar: ${matchedPhones.length} ta`);

      if (matchedPhones.length > 0) {
        console.log(`      - ${matchedPhones[0].phone}: "${matchedPhones[0].last_message.substring(0, 50)}..."`);
      }
    }

    // Tozalash
    await query('DELETE FROM phones WHERE phone = ?', ['+998991234567']);
    await query('DELETE FROM groups WHERE id = 8888');
    await query('DELETE FROM routes WHERE name = ?', ['Qashqadaryo → Toshkent']);

  } catch (error) {
    console.error('   ❌ Database xatosi:', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ TEST TUGADI');
  console.log('='.repeat(70) + '\n');
}

testMultiCity().catch(console.error);