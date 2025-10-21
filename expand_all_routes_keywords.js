const { query } = require('./src/database/sqlite');

// Har bir tuman uchun 50+ kalit so'zlar
const districtKeywords = {
  "Yakkabog'": [
    // Asosiy
    'yakkabog', "yakkabog'", 'yakkabogga', 'yakkabogdan', 'yakkabogda',
    // Apostroflar
    'yakkaboʻg', 'yakkaboʼg', 'yakkaboʹg',
    // Xatoliklar
    'yakkabag', 'yakkaboh', 'yakkabоg', 'yakabog', 'yaqabog',
    'yakkabogʻ', 'yakkaboğ', 'yakkabоğ',
    // Barcha shakllari
    'yakkabagga', 'yakkabagdan', 'yakkaboхga', 'yakkaboхdan',
    'yakkabоgga', 'yakkabоgdan', 'yaqabogga', 'yaqabogdan',
    // Kirill - barcha variantlar
    'яккабоғ', 'яккабог', 'яккабоғ', 'яққабоғ',
    'яккабоғга', 'яккабоғдан', 'яккабоғда',
    'яккабогга', 'яккабогдан', 'яккабогда',
    // Ruscha xatoliklar
    'яккабог', 'яккабог', 'яккабох',
    // Kitob
    'kitob', 'kitobga', 'kitobdan',
    // Qisqartmalar
    'yakka', 'yakkaga', 'yakkadan'
  ],

  "Qarshi": [
    // Asosiy
    'qarshi', 'qarshiga', 'qarshidan', 'qarshida',
    // Xatoliklar
    'karshi', 'qarshy', 'qarshi', 'qarshi',
    'garshi', 'qorshi', 'qаrshi', 'qarshi',
    // Barcha shakllari
    'karshiga', 'karshidan', 'qarshyga', 'qarshydan',
    'garshiga', 'garshidan', 'qorshiga', 'qorshidan',
    // Kirill - barcha variantlar
    'қарши', 'карши', 'қарший', 'қаршй',
    'қаршига', 'қаршидан', 'қаршида',
    'каршига', 'каршидан', 'каршида',
    // Ruscha xatoliklar
    'карши', 'карший', 'каршы',
    'қарши', 'қаршй', 'қаршы',
    // Qisqartmalar
    'qar', 'qarga', 'qardan',
    // Ko'p uchraydigan xatoliklar
    'qrshi', 'qrshiga', 'qrshidan'
  ],

  "Shahrisabz": [
    // Asosiy
    'shahrisabz', 'shahrisabzga', 'shahrisabzdan', 'shahrisabzda',
    // Xatoliklar
    'shaxrisabz', 'shahrisabs', 'shahrisabс',
    'shaхrisabz', 'sharisabz', 'shahrsabz',
    // Barcha shakllari
    'shaxrisabzga', 'shaxrisabzdan', 'shahrisabsga', 'shahrisabsdan',
    'shaхrisabzga', 'shaхrisabzdan', 'sharisabzga', 'sharisabzdan',
    // Kirill - barcha variantlar
    'шахрисабз', 'шаҳрисабз', 'шахрисабс',
    'шахрисабзга', 'шахрисабздан', 'шахрисабзда',
    'шаҳрисабзга', 'шаҳрисабздан', 'шаҳрисабзда',
    // Ruscha xatoliklar
    'шахрисабс', 'шахрисабц', 'шахрисабз',
    // Qisqartmalar
    'sabz', 'sabzga', 'sabzdan',
    'shahr', 'shahrga', 'shahrdan',
    // Ko'p uchraydigan
    'shahrisаbz', 'shahrisаbzga'
  ],

  "G'uzor": [
    // Asosiy
    'guzor', "g'uzor", 'guzorga', 'guzordan', 'guzorda',
    // Apostroflar
    'gʻuzor', 'gʼuzor', 'gʹuzor', 'ғузор',
    // Xatoliklar
    'guzоr', 'guzоr', 'guzоr', 'guzor',
    'ghuzor', 'quzor', 'guzor',
    // Barcha shakllari
    'gʻuzorga', 'gʻuzordan', 'guzorga', 'guzordan',
    'ghuzorga', 'ghuzordan', 'quzorga', 'quzordan',
    // Kirill - barcha variantlar
    'ғузор', 'гузор', 'ғузор', 'гъузор',
    'ғузорга', 'ғузордан', 'ғузорда',
    'гузорга', 'гузордан', 'гузорда',
    // Ruscha xatoliklar
    'гузор', 'гузар', 'гузур',
    // Qisqartmalar
    'guz', 'guzga', 'guzdan'
  ],

  "Koson": [
    // Asosiy
    'koson', 'kosonga', 'kosondan', 'kosonda',
    // Xatoliklar
    'kason', 'koson', 'koson', 'kasоn',
    'qoson', 'qason', 'koson',
    // Barcha shakllari
    'kasonga', 'kasondan', 'qosonga', 'qosondan',
    'qasonga', 'qasondan',
    // Kirill - barcha variantlar
    'қосон', 'косон', 'қасон', 'касон',
    'қосонга', 'қосондан', 'қосонда',
    'косонга', 'косондан', 'косонда',
    // Ruscha xatoliklar
    'косон', 'касон', 'козон',
    'қасон', 'қозон',
    // Qisqartmalar
    'kos', 'kosga', 'kosdan',
    'kas', 'kasga', 'kasdan'
  ],

  "Nishon": [
    // Asosiy
    'nishon', 'nishonga', 'nishondan', 'nishonda',
    // Xatoliklar
    'nishоn', 'nishоn', 'nishon', 'nshan',
    'nisхon', 'nishоn', 'nishoп',
    // Barcha shakllari
    'nishоnga', 'nishоndan', 'nshonga', 'nshondan',
    'nisхonga', 'nisхondan',
    // Kirill - barcha variantlar
    'нишон', 'нишан', 'нишон', 'нишoн',
    'нишонга', 'нишондан', 'нишонда',
    'нишанга', 'нишандан', 'нишанда',
    // Ruscha xatoliklar
    'нишон', 'нишан', 'нишoн',
    'нишoнга', 'нишoндан',
    // Qisqartmalar
    'nish', 'nishga', 'nishdan',
    'nshan', 'nshanga', 'nshandan'
  ],

  "Qamashi": [
    // Asosiy
    'qamashi', 'qamashiga', 'qamashidan', 'qamashida',
    // Xatoliklar
    'kamashi', 'qаmashi', 'qamаshi', 'qamаshi',
    'qomashi', 'qamashi', 'qamashi',
    // Barcha shakllari
    'kamashiga', 'kamashidan', 'qomashiga', 'qomashidan',
    'qаmashiga', 'qаmashidan',
    // Kirill - barcha variantlar
    'қамаши', 'камаши', 'қамашй', 'қамаший',
    'қамашига', 'қамашидан', 'қамашида',
    'камашига', 'камашидан', 'камашида',
    // Ruscha xatoliklar
    'камаши', 'қамаши', 'камаший',
    'қамашй', 'камашй',
    // Qisqartmalar
    'qam', 'qamga', 'qamdan',
    'kam', 'kamga', 'kamdan'
  ],

  "Muborak": [
    // Asosiy
    'muborak', 'muborakga', 'muborakdan', 'muborakda',
    // Xatoliklar
    'mubarok', 'muborаk', 'muborаk', 'mubarak',
    'muborak', 'moborak', 'muborak',
    // Barcha shakllari
    'mubarokga', 'mubarokdan', 'muborakga', 'muborakdan',
    'moborakga', 'moborakdan',
    // Kirill - barcha variantlar
    'муборак', 'мубарак', 'муборак', 'муборак',
    'муборакга', 'муборакдан', 'муборакда',
    'мубаракга', 'мубаракдан', 'мубаракда',
    // Ruscha xatoliklar
    'муборак', 'мубарак', 'муборок',
    'мубарок', 'муборак',
    // Qisqartmalar
    'mub', 'mubga', 'mubdan',
    'mob', 'mobga', 'mobdan'
  ],

  "Kasbi": [
    // Asosiy
    'kasbi', 'kasbiga', 'kasbidan', 'kasbida',
    // Xatoliklar
    'kasby', 'kasbi', 'kasbi', 'kаsbi',
    'qasbi', 'kasbi', 'kasbi',
    // Barcha shakllari
    'kasbyga', 'kasbydan', 'qаsbiga', 'qаsbidan',
    'qаsbiga', 'qаsbidan',
    // Kirill - barcha variantlar
    'касби', 'қасби', 'касбй', 'касбий',
    'касбига', 'касбидан', 'касбида',
    'қасбига', 'қасбидан', 'қасбида',
    // Ruscha xatoliklar
    'касби', 'касбы', 'қасби',
    'касбй', 'касбии',
    // Qisqartmalar
    'kas', 'kasga', 'kasdan',
    'qas', 'qasga', 'qasdan'
  ],

  "Dehqonobod": [
    // Asosiy
    'dehqonobod', 'dehqonobodga', 'dehqonoboddan', 'dehqonobodda',
    // Xatoliklar
    'dexqonobod', 'deqonobod', 'dehqonоbod', 'deхqonobod',
    'dehqanabad', 'dehqonabad', 'dehqonоbоd',
    // Barcha shakllari
    'dexqonobodga', 'dexqonoboddan', 'deqonobodga', 'deqonoboddan',
    'dehqanabadga', 'dehqanabaddan',
    // Kirill - barcha variantlar
    'деҳқонобод', 'дехқонобод', 'деқонобод', 'деҳқанабад',
    'деҳқонободга', 'деҳқонободдан', 'деҳқонободда',
    'дехқонободга', 'дехқонободдан', 'дехқонободда',
    // Ruscha xatoliklar
    'дехконобод', 'дехқонобод', 'деқонобод',
    'деҳқонабад', 'дехқанабад',
    // Qisqartmalar
    'dehqon', 'dehqonga', 'dehqondan',
    'deqon', 'deqonga', 'deqondan'
  ],

  "Chiroqchi": [
    // Asosiy
    'chiroqchi', 'chiroqchiga', 'chiroqchidan', 'chiroqchida',
    // Apostroflar
    'chiroʻqchi', 'chiroʼqchi', 'chiroʹqchi',
    // Xatoliklar
    'chirqchi', 'chiriqchi', 'chirokchi', 'chirochchi',
    'chiraqchi', 'chiroqqchi', 'chiruqchi',
    'chiruqchiga', 'chirqchiga', 'chiriqchiga', 'chirokchiga',
    'chiruqchidan', 'chirqchidan', 'chiriqchidan', 'chirokchidan',
    // Kirill
    'чироқчи', 'чирокчи', 'чирикчи', 'чирўқчи',
    'чирақчи', 'чируқчи', 'чирқчи',
    'чироқчига', 'чироқчидан', 'чироқчида',
    // Ruscha xatoliklar
    'чирочи', 'чирочки', 'чирочкы',
    // Qisqartmalar
    'chirq', 'chiroq', 'chirqga', 'chiroqga'
  ],

  "Kitob": [
    // Asosiy
    'kitob', 'kitobga', 'kitobdan', 'kitobda',
    // Apostroflar
    'kitoʻb', 'kitoʼb', 'kitoʹb',
    // Xatoliklar
    'kitab', 'ketob', 'kitub', 'qitob', 'kitop',
    'kitabga', 'kitabdan', 'ketobga', 'ketobdan',
    'kitubga', 'kitubdan', 'qitobga', 'qitobdan',
    // Kirill
    'китоб', 'китаб', 'кітоб', 'кітаб',
    'китобга', 'китобдан', 'китобда',
    'китабга', 'китабдан', 'китабда',
    // Ruscha xatoliklar
    'китоп', 'китопга', 'китопдан',
    // Bo'g'inda
    'ки-тоб', 'ки тоб'
  ]
};

(async () => {
  console.log('\n🔧 BARCHA YO\'NALISHLAR UCHUN 50+ KALIT SO\'ZLAR QO\'SHISH:\n');

  let totalUpdated = 0;

  for (const [districtName, keywords] of Object.entries(districtKeywords)) {
    const keywordString = keywords.join(', ');
    const count = keywords.length;

    console.log(`\n📍 ${districtName}: ${count} ta variant`);

    // Toshkent → Qashqadaryo (Tuman)
    const route1 = `Toshkent → Qashqadaryo (${districtName})`;
    const result1 = await query(
      `UPDATE routes SET to_keywords = ? WHERE name = ? AND active = 1`,
      [keywordString, route1]
    );
    if (result1.changes > 0) {
      console.log(`  ✅ ${route1}`);
      totalUpdated++;
    }

    // Qashqadaryo (Tuman) → Toshkent
    const route2 = `Qashqadaryo (${districtName}) → Toshkent`;
    const result2 = await query(
      `UPDATE routes SET from_keywords = ? WHERE name = ? AND active = 1`,
      [keywordString, route2]
    );
    if (result2.changes > 0) {
      console.log(`  ✅ ${route2}`);
      totalUpdated++;
    }
  }

  console.log(`\n✅ Jami ${totalUpdated} ta yo'nalish yangilandi!`);
  console.log(`📊 Har bir tuman uchun 35-50+ kalit so'z qo'shildi!\n`);

  process.exit(0);
})();
