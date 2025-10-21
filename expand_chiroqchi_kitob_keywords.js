const { query } = require('./src/database/sqlite');

(async () => {
  console.log('\n🔧 CHIROQCHI VA KITOB KALIT SO\'ZLARINI KENGAYTIRISH (30+ variant):\n');

  // CHIROQCHI - barcha mumkin bo'lgan variantlar
  const chiroqchiKeywords = [
    // Asosiy variantlar
    'chiroqchi', 'chiroqchiga', 'chiroqchidan', 'chiroqchida',
    // O' va ' variantlari
    'chiroʻqchi', 'chiroʼqchi', 'chiroʹqchi',
    // Xatoliklar va dialektlar
    'chirqchi', 'chiriqchi', 'chirokchi', 'chirochchi',
    'chiraqchi', 'chiroqqchi', 'chiruqchi',
    'chiruqchiga', 'chirqchiga', 'chiriqchiga', 'chirokchiga',
    'chiruqchidan', 'chirqchidan', 'chiriqchidan', 'chirokchidan',
    // Kirill - barcha variantlar
    'чироқчи', 'чирокчи', 'чирикчи', 'чирўқчи',
    'чирақчи', 'чируқчи', 'чирқчи',
    'чироқчига', 'чироқчидан', 'чироқчида',
    // Ruscha xatoliklar
    'чирочи', 'чирочки', 'чирочкы',
    // Qisqartmalar
    'chirq', 'chiroq'
  ].join(', ');

  // KITOB - barcha mumkin bo'lgan variantlar
  const kitobKeywords = [
    // Asosiy variantlar
    'kitob', 'kitobga', 'kitobdan', 'kitobda',
    // O' va ' variantlari
    'kitoʻb', 'kitoʼb', 'kitoʹb',
    // Xatoliklar
    'kitab', 'ketob', 'kitub', 'qitob', 'kitop',
    'kitabga', 'kitabdan', 'ketobga', 'ketobdan',
    'kitubga', 'kitubdan', 'qitobga', 'qitobdan',
    // Kirill - barcha variantlar
    'китоб', 'китаб', 'кітоб', 'кітаб',
    'китобга', 'китобдан', 'китобда',
    'китабга', 'китабдан', 'китабда',
    // Ruscha xatoliklar
    'китоп', 'китопга', 'китопдан',
    // Bo'g'inda
    'ки-тоб', 'ки тоб'
  ].join(', ');

  const chiroqchiCount = chiroqchiKeywords.split(', ').length;
  const kitobCount = kitobKeywords.split(', ').length;

  console.log('✅ Chiroqchi: ' + chiroqchiCount + ' ta variant');
  console.log('✅ Kitob: ' + kitobCount + ' ta variant\n');

  // Chiroqchi TO (Toshkent → Qashqadaryo)
  await query(
    `UPDATE routes SET to_keywords = ? WHERE name = ?`,
    [chiroqchiKeywords, 'Toshkent → Qashqadaryo (Chiroqchi)']
  );
  console.log('✅ Toshkent → Qashqadaryo (Chiroqchi) yangilandi');

  // Chiroqchi FROM (Qashqadaryo → Toshkent)
  await query(
    `UPDATE routes SET from_keywords = ? WHERE name = ?`,
    [chiroqchiKeywords, 'Qashqadaryo (Chiroqchi) → Toshkent']
  );
  console.log('✅ Qashqadaryo (Chiroqchi) → Toshkent yangilandi');

  // Kitob TO (Toshkent → Qashqadaryo)
  await query(
    `UPDATE routes SET to_keywords = ? WHERE name = ?`,
    [kitobKeywords, 'Toshkent → Qashqadaryo (Kitob)']
  );
  console.log('✅ Toshkent → Qashqadaryo (Kitob) yangilandi');

  // Kitob FROM (Qashqadaryo → Toshkent)
  await query(
    `UPDATE routes SET from_keywords = ? WHERE name = ?`,
    [kitobKeywords, 'Qashqadaryo (Kitob) → Toshkent']
  );
  console.log('✅ Qashqadaryo (Kitob) → Toshkent yangilandi');

  console.log('\n✅ Kalit so\'zlar 30+ ga kengaytirildi!\n');
  process.exit(0);
})();
