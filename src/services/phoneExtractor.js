// 100+ FORMATNI QO'LLAB-QUVVATLOVCHI TELEFON EXTRACTION ENGINE

const OPERATOR_CODES = [
  '90', '91', '93', '94', '95', '97', '98', '99', // Mobile
  '88', '50', '55', '33',                          // Mobile (qo'shimcha)
  '71', '20', '61', '62', '65', '66', '67', '69', '70', '73', '74', '75', '76', '79' // Landline
];

/**
 * Matndan barcha telefon raqamlarni topish (100+ format)
 */
function extractPhones(text) {
  if (!text || typeof text !== 'string') return [];

  // Bo'sh matnni tekshirish
  if (text.trim().length === 0) return [];

  const phones = new Set();
  const normalizedText = text.toLowerCase();

  // 1. TELEFON REGEX PATTERNLAR
  const patterns = [
    // +998901234567, 998901234567, 8998901234567
    /(\+?998|8998)[\s\-\.]?(\d{2})[\s\-\.]?(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})/g,

    // +998(90)1234567, 998(90)1234567
    /(\+?998)\s?\((\d{2})\)\s?(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})/g,

    // 901234567, 71-234-56-78 (9 raqam)
    /(?<!\d)(\d{2})[\s\-\.]?(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})(?!\d)/g,

    // (90) 123-45-67
    /\((\d{2})\)[\s\-\.]?(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})/g,

    // Tel: 90 123 45 67, raqam: 90-123-45-67
    /(?:tel|telefon|raqam|phone|nomer|contact)[:\s]+(\+?998)?[\s\-\.\(]*(\d{2})[\s\-\.\)]*(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})/gi,

    // t.me/+998901234567, wa.me/998901234567
    /(?:t\.me|wa\.me|whatsapp|telegram)\/(\+?998)?(\d{2})(\d{3})(\d{2})(\d{2})/gi,

    // HTML tel: link
    /tel:(\+?998)?(\d{2})(\d{3})(\d{2})(\d{2})/gi
  ];

  // 2. BARCHA PATTERNLAR BILAN QIDIRISH
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const extracted = extractNumberFromMatch(match);
      if (extracted) {
        const normalized = normalizePhone(extracted, normalizedText);
        if (normalized && isValidUzbekPhone(normalized)) {
          phones.add(normalized);
        }
      }
    }
  });

  // 3. ODDIY RAQAMLARNI TOPISH (99-123-45-67)
  const simplePattern = /\b(\d{2})[\s\-\.](\d{3})[\s\-\.](\d{2})[\s\-\.](\d{2})\b/g;
  const textCopy = text.slice(); // Bug fix: regex lastIndex muammosi uchun
  let match;
  while ((match = simplePattern.exec(textCopy)) !== null) {
    const parts = [match[1], match[2], match[3], match[4]];
    const operatorCode = parts[0];

    if (OPERATOR_CODES.includes(operatorCode)) {
      const fullNumber = '+998' + parts.join('');
      if (isValidUzbekPhone(fullNumber)) {
        phones.add(fullNumber);
      }
    }
  }

  // 4. CONTEXTUAL EXTRACTION (shahar nomlari bilan)
  const contextualPhones = extractWithContext(normalizedText);
  contextualPhones.forEach(phone => {
    if (isValidUzbekPhone(phone)) {
      phones.add(phone);
    }
  });

  return Array.from(phones);
}

/**
 * Regex match dan raqam extraction
 */
function extractNumberFromMatch(match) {
  // Match array dan barcha raqamlarni olish
  const parts = match.slice(1).filter(p => p && /\d/.test(p));
  return parts.join('');
}

/**
 * Raqamni +998XXYYYOOJJ formatiga keltirish
 */
function normalizePhone(phone, context = '') {
  if (!phone) return null;

  // Barcha non-digit belgilarni olib tashlash
  let cleaned = phone.replace(/\D/g, '');

  // Holatlar:
  // 1. 8998XXYYYOOJJ -> +998XXYYYOOJJ
  if (cleaned.length === 13 && cleaned.startsWith('8998')) {
    cleaned = cleaned.substring(1);
  }

  // 2. 998XXYYYOOJJ -> +998XXYYYOOJJ
  if (cleaned.length === 12 && cleaned.startsWith('998')) {
    const operatorCode = cleaned.substring(3, 5);
    if (OPERATOR_CODES.includes(operatorCode)) {
      return '+' + cleaned;
    }
  }

  // 3. XXYYYOOJJ (9 raqam) -> +998XXYYYOOJJ
  if (cleaned.length === 9) {
    const operatorCode = cleaned.substring(0, 2);
    if (OPERATOR_CODES.includes(operatorCode)) {
      return '+998' + cleaned;
    }
  }

  // 4. YYYOOJJ (7 raqam) - context yordamida
  if (cleaned.length === 7) {
    const operatorCode = guessOperatorFromContext(context);
    if (operatorCode) {
      return '+998' + operatorCode + cleaned;
    }
  }

  return null;
}

/**
 * Kontekstdan operator kodni topish
 */
function guessOperatorFromContext(context) {
  const contextLower = context.toLowerCase();

  // Shahar nomlari -> kod
  const cityMap = {
    'toshkent': '71',
    'tashkent': '71',
    'samarqand': '66',
    'samarkand': '66',
    'buxoro': '65',
    'bukhara': '65',
    'andijon': '74',
    'andijan': '74',
    "farg'ona": '73',
    'fergana': '73',
    'namangan': '69',
    'qashqadaryo': '75',
    'kashkadarya': '75',
    'surxondaryo': '76',
    'surkhandarya': '76',
    'jizzax': '72',
    'jizzakh': '72',
    'navoiy': '79',
    'xorazm': '62',
    'khorezm': '62',
    'qoraqalpog\'iston': '61',
    'karakalpakstan': '61'
  };

  // Operator nomlari
  const operatorMap = {
    'beeline': '90',
    'ucell': '93',
    'uzmobile': '95',
    'mobiuz': '97',
    'perfectum': '88',
    'humans': '50'
  };

  // Shaharni topish
  for (const [city, code] of Object.entries(cityMap)) {
    if (contextLower.includes(city)) {
      return code;
    }
  }

  // Operatorni topish
  for (const [operator, code] of Object.entries(operatorMap)) {
    if (contextLower.includes(operator)) {
      return code;
    }
  }

  return null;
}

/**
 * Kontekst bilan qidirish
 */
function extractWithContext(text) {
  const phones = [];

  // "Toshkentdan 234-56-78" kabi formatlar
  const contextPattern = /(toshkent|samarqand|buxoro|andijon|farg'ona|namangan|beeline|ucell)\D{0,20}(\d{3})[\s\-\.]?(\d{2})[\s\-\.]?(\d{2})/gi;

  let match;
  while ((match = contextPattern.exec(text)) !== null) {
    const context = match[1];
    const number = match[2] + match[3] + match[4]; // 7 raqam

    const operatorCode = guessOperatorFromContext(context);
    if (operatorCode) {
      phones.push('+998' + operatorCode + number);
    }
  }

  return phones;
}

/**
 * Telefon formatini validatsiya qilish
 */
function isValidUzbekPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;

  if (!phone.startsWith('+998')) return false;

  const cleaned = phone.replace(/\D/g, '');

  // Uzunlikni tekshirish
  if (cleaned.length !== 12) return false;

  // Operator kodni tekshirish
  const operatorCode = cleaned.substring(3, 5);
  if (!OPERATOR_CODES.includes(operatorCode)) return false;

  // Qolgan raqamlarni tekshirish (faqat digits)
  const remainingDigits = cleaned.substring(5);
  if (!/^\d{7}$/.test(remainingDigits)) return false;

  return true;
}

/**
 * Test funksiyasi
 */
function testExtraction() {
  const testCases = [
    '901234567',
    '+998901234567',
    '998901234567',
    '8998901234567',
    '90-123-45-67',
    '90 123 45 67',
    '90.123.45.67',
    '(90) 123-45-67',
    '+998(90)1234567',
    'Tel: 90 123 45 67',
    'raqam 901234567',
    't.me/+998901234567',
    'wa.me/998901234567',
    '88 810 68 28',
    '+998 90-123.45 67',
    'Toshkentdan 234-56-78',
    'Beeline 91-123-45-67',
    'Yuk bor 99 590 03 90 telefon',
    'Ko\'p raqam: 90-123-45-67, 91-234-56-78, 93-345-67-89'
  ];

  console.log('=== PHONE EXTRACTION TEST ===\n');
  testCases.forEach(test => {
    const result = extractPhones(test);
    console.log(`Input:  "${test}"`);
    console.log(`Output: ${result.join(', ')}`);
    console.log('');
  });
}

module.exports = {
  extractPhones,
  normalizePhone,
  isValidUzbekPhone,
  testExtraction
};
