/**
 * QASHQADARYO VILOYATI - BARCHA SHAHARLAR UCHUN 100+ KALIT SO'ZLAR
 * Multi-shahar e'lonlarni ham qo'llab-quvvatlaydi
 */

const QASHQADARYO_KEYWORDS = {
  // 1. QARSHI - Markaz shahar
  qarshi: [
    'qarshi', 'qarshi shahar', 'qarshi shahri',
    'karshi', 'karshi shahar', 'karshi shahri',
    'карши', 'каршы', 'қарши',
    'qarshi city', 'q.sh', 'qar', 'kar',
    'qorshi', 'korshi', 'qarshe', 'karshe'
  ],

  // 2. YAKKABOG' (KITOB)
  yakkabog: [
    'yakkabog', 'yakkabog\'', 'yakkabagh', 'yakkabog tuman', 'yakkabog tumani',
    'yakabog', 'yakabagh', 'yakkabagh',
    'яккабог', 'яккабоғ', 'яккабаг',
    'kitob', 'kitob tuman', 'kitob tumani', 'kitob shahri',
    'китоб', 'kытоб',
    'yakkabg', 'ykbg', 'yakka', 'yakkabo', 'yakkabag',
    'kiтоб', 'qitob', 'qitоб'
  ],

  // 3. SHAHRISABZ
  shahrisabz: [
    'shahrisabz', 'shahrisabz shahar', 'shahrisabz shahri', 'shahrisabz sh',
    'shaxrisabz', 'shaxrisabz shahar',
    'shahrisabs', 'shaxrisabs', 'shahrisabzz',
    'шахрисабз', 'шахрисабс', 'шаҳрисабз',
    'shaxri sabz', 'shahri sabz', 'shahar sabz',
    'shs', 'shsabz', 'sh.sabz', 'sh sabz',
    'shаxrisabz', 'shаhrisabz'
  ],

  // 4. KOSON
  koson: [
    'koson', 'koson tuman', 'koson tumani',
    'qoson', 'qoson tuman', 'qoson tumani',
    'косон', 'қосон', 'ķосон',
    'kason', 'kasson', 'kosen', 'qosen',
    'kosn', 'kos', 'qos'
  ],

  // 5. GUZOR (G'UZOR)
  guzor: [
    'guzor', 'g\'uzor', 'guzor tuman', 'g\'uzor tumani',
    'guzar', 'g\'uzar', 'guzor sh',
    'гузор', 'ғузор', 'гузар',
    'guzor shahri', 'guzor shahar',
    'gzr', 'guz', 'g\'uz'
  ],

  // 6. CHIROQCHI (CHIRAKCHI)
  chiroqchi: [
    'chiroqchi', 'chiroqchi tuman', 'chiroqchi tumani',
    'chirakchi', 'chirakchi tuman',
    'chiroqchi shahar', 'chiroqchi sh',
    'чироқчи', 'чиракчи', 'чирокчи',
    'chir', 'chirchi', 'chiriq', 'chiraq',
    'chiroqche', 'chiroqchy'
  ],

  // 7. MUBORAK
  muborak: [
    'muborak', 'muborak tuman', 'muborak tumani',
    'muborak shahar', 'muborak sh',
    'mubarek', 'mubarok', 'mubarok tuman',
    'муборак', 'мубарак', 'мубарек',
    'mubarak', 'mubarek tuman',
    'mbk', 'mub', 'mubo'
  ],

  // 8. KASBI (KASBI)
  kasbi: [
    'kasbi', 'kasbi tuman', 'kasbi tumani',
    'kasbi shahar', 'kasbi sh',
    'kasbe', 'kasbye', 'kasb',
    'касби', 'касбе', 'касбы',
    'ksb', 'kas', 'kasb tuman'
  ],

  // 9. NISHON
  nishon: [
    'nishon', 'nishon tuman', 'nishon tumani',
    'nishon shahar', 'nishon sh',
    'nišon', 'nіshon', 'nishоn',
    'нишон', 'нишан', 'ниshon',
    'nsh', 'nish', 'nishоn tuman'
  ],

  // 10. QAMASHI (KAMASHI)
  qamashi: [
    'qamashi', 'qamashi tuman', 'qamashi tumani',
    'kamashi', 'kamashi tuman', 'kamashi tumani',
    'qamashi sh', 'kamashi sh',
    'камаши', 'қамаши', 'камашы',
    'qmsh', 'kam', 'qam', 'kamsh'
  ],

  // 11. MIRISHKOR
  mirishkor: [
    'mirishkor', 'mirishkor tuman', 'mirishkor tumani',
    'mirishkor shahar', 'mirishkor sh',
    'mirishkоr', 'mіrishkor', 'mirshkor',
    'миришкор', 'миришкур', 'миришқор',
    'mrsh', 'mir', 'mirish', 'mirshk'
  ],

  // 12. DEHQONOBOD
  dehqonobod: [
    'dehqonobod', 'dehqonobod tuman', 'dehqonobod tumani',
    'dehqonobod sh', 'dehqonabad', 'dehqonobod shahar',
    'дехқонобод', 'дехконобод', 'дехканабад',
    'dehqonоbod', 'deh', 'deq', 'dqb',
    'dehkan', 'dehkon', 'dehqon'
  ],

  // 13. KAMASHI
  kamashi: [
    'kamashi', 'kamashi tuman', 'kamashi tumani',
    'kamashi sh', 'kamashi shahar',
    'kamashі', 'kamashу', 'kamashe',
    'камаши', 'камашы', 'камаше',
    'kam', 'kms', 'kamsh'
  ],

  // UMUMIY QASHQADARYO
  qashqadaryo: [
    'qashqadaryo', 'qashqadaryo viloyati', 'qashqadaryo vil',
    'qashqadarya', 'qashqadaryo obl',
    'kashkadarya', 'kashkadaryo', 'kashkadarya obl',
    'кашкадарья', 'қашқадарё', 'кашкадарйа',
    'qq', 'qqd', 'qash', 'qashqa'
  ]
};

// TOSHKENT kalit so'zlari
const TOSHKENT_KEYWORDS = [
  'toshkent', 'toshkentga', 'toshkentdan', 'toshkent shahar',
  'tashkent', 'tashkentga', 'tashkentdan',
  'тошкент', 'тошкентга', 'тошкентдан',
  'toshkent sh', 'toshkent shahri', 'toshkent city',
  'tk', 'tsh', 'toshk', 'tashk',
  'toshkеnt', 'tаshkent', 'тоshkent'
];

/**
 * Multi-shahar e'lonlarni ajratish
 * Masalan: "Kitob, Yakkabog', Shahrisabzdan Toshkentga"
 * Bu e'lon Yakkabog', Shahrisabz va Kitob uchun ham saqlanadi
 */
function findAllMatchingDistricts(text) {
  const lowerText = text.toLowerCase();
  const matchedDistricts = [];

  // Har bir tuman uchun tekshirish
  for (const [district, keywords] of Object.entries(QASHQADARYO_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedDistricts.push(district);
        break; // Bir marta topilsa yetarli
      }
    }
  }

  return [...new Set(matchedDistricts)]; // Unikal qilish
}

/**
 * Toshkent kalit so'zi borligini tekshirish
 */
function hasToshkentKeyword(text) {
  const lowerText = text.toLowerCase();
  return TOSHKENT_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

module.exports = {
  QASHQADARYO_KEYWORDS,
  TOSHKENT_KEYWORDS,
  findAllMatchingDistricts,
  hasToshkentKeyword
};
