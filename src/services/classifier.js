const { getUserClassification } = require('../database/logistics');

// Ayol ismlari ro'yxati
const FEMALE_NAMES = [
  'madina', 'sitora', 'nilufar', 'malika', 'zarina', 'dilnoza', 'feruza',
  'nodira', 'shahlo', 'gulnora', 'mohira', 'zebiniso', 'aziza', 'fotima',
  'maryam', 'oysha', 'xadija', 'zuxra', 'saodat', 'nasiba', 'dilfuza'
];

// Ayol ism patternlari
const FEMALE_PATTERNS = [
  'gul', 'oy', 'nisa', 'niso', 'jon', 'bibi', 'xon', 'poshsha', 'qiz'
];

// Logistika kalit so'zlari (dispecher uchun)
const LOGISTICS_KEYWORDS = [
  'logistik', 'dispecher', 'dispetcher', 'yuk tashish', 'транспорт',
  'perevozka', 'cargo', 'shipping', 'грузоперевозк', 'avtotransport',
  'yuk mashina', 'logist', 'доставка', 'tashish xizmat'
];

/**
 * Ayol ismini aniqlash (ro'yxat + pattern)
 */
function isFemale(firstName, username) {
  if (!firstName && !username) return false;

  const fullName = `${firstName || ''} ${username || ''}`.toLowerCase();

  // Ro'yxatdan tekshirish
  for (const name of FEMALE_NAMES) {
    if (fullName.includes(name)) return true;
  }

  // Pattern tekshirish
  for (const pattern of FEMALE_PATTERNS) {
    if (fullName.includes(pattern)) return true;
  }

  return false;
}

/**
 * Logistika kalit so'zlarini tekshirish
 */
function hasLogisticsKeywords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();

  for (const keyword of LOGISTICS_KEYWORDS) {
    if (lowerText.includes(keyword)) return true;
  }

  return false;
}

/**
 * Multi-announcement detection (2+ yo'nalish)
 */
function hasMultipleRoutes(text) {
  if (!text) return false;

  // Variant 1: Raqamli (1., 2., 3.)
  const numberedMatches = text.match(/\d+\.\s*[А-ЯЎҚҒҲа-яўқғҳA-Za-z]/g);
  if (numberedMatches && numberedMatches.length >= 2) return true;

  // Variant 2: Bir nechta yo'nalish (shahar-shahar pattern)
  const routePattern = /[А-ЯЎҚҒҲа-яўқғҳA-Za-z]{3,}\s*[-–—]\s*[А-ЯЎҚҒҲа-яўқғҳA-Za-z]{3,}/g;
  const routes = text.match(routePattern);
  if (routes && routes.length >= 2) return true;

  // Variant 3: Bir nechta yuk (tonnaj)
  const tonMatches = text.match(/\d+\s*т\b/gi);
  if (tonMatches && tonMatches.length >= 2) return true;

  return false;
}

/**
 * User haqida ma'lumot to'plash
 */
async function getUserInfo(telegramClient, userId, groupsList) {
  try {
    // User ma'lumotlarini olish
    const userEntity = await telegramClient.getEntity(userId);

    let groupsCount = 0;
    const logisticsGroups = [];

    // Faqat logistics guruhlar sonini sanash
    for (const group of groupsList) {
      try {
        const participants = await telegramClient.getParticipants(group.id, { limit: 100 });
        const isMember = participants.some(p => p.id.toString() === userId.toString());

        if (isMember) {
          groupsCount++;
          logisticsGroups.push(group.name);
        }
      } catch (err) {
        // Guruhga kirish huquqi yo'q bo'lishi mumkin
        continue;
      }
    }

    return {
      firstName: userEntity.firstName || '',
      lastName: userEntity.lastName || '',
      username: userEntity.username || '',
      bio: userEntity.about || '',
      groupsCount,
      logisticsGroups
    };
  } catch (error) {
    console.error('getUserInfo xatosi:', error.message);
    return null;
  }
}

/**
 * Kunlik e'lonlar sonini hisoblash
 */
function getDailyPostsCount(telegramId, announcements) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let count = 0;
  for (const ann of announcements) {
    if (ann.user_telegram_id === telegramId) {
      const annDate = new Date(ann.posted_at);
      annDate.setHours(0, 0, 0, 0);

      if (annDate.getTime() === today.getTime()) {
        count++;
      }
    }
  }

  return count;
}

/**
 * YUKCHI klassifikatsiya (ball tizimi)
 * 40+ ball = YUKCHI
 * 40 dan kam = DISPECHER
 */
async function classifyUser(telegramId, username, firstName, messageText, telegramClient = null, groupsList = [], announcements = []) {
  let score = 0;
  const details = {
    groupsCount: 0,
    dailyPostsCount: 0,
    hasLogisticsKeywords: false,
    isFemale: false,
    hasMultiRoutes: false
  };

  // 1. Admin tomonidan tasdiqlangan bo'lsa
  const userClassification = getUserClassification(telegramId);
  if (userClassification && userClassification.admin_verified) {
    return {
      category: userClassification.category,
      score: 100,
      details: {
        adminVerified: true,
        ...details
      }
    };
  }

  // 2. Guruhlar soni (faqat logistics guruhlar)
  if (telegramClient && groupsList.length > 0) {
    const userInfo = await getUserInfo(telegramClient, telegramId, groupsList);
    if (userInfo) {
      details.groupsCount = userInfo.groupsCount;
      firstName = firstName || userInfo.firstName;
      username = username || userInfo.username;

      // ≤15 logistics guruh = +30 ball (YUKCHI)
      if (userInfo.groupsCount <= 15) {
        score += 30;
      }

      // Username/bio'da logistika so'zlari yo'q = +20 ball (YUKCHI)
      const hasKeywords = hasLogisticsKeywords(userInfo.username + ' ' + userInfo.bio);
      details.hasLogisticsKeywords = hasKeywords;
      if (!hasKeywords) {
        score += 20;
      }
    }
  }

  // 3. Kunlik e'lonlar (≤2 = +25 ball) - kalendar kun
  const dailyPosts = getDailyPostsCount(telegramId, announcements);
  details.dailyPostsCount = dailyPosts;
  if (dailyPosts <= 2) {
    score += 25;
  }

  // 4. Ayol ismi YO'Q = +15 ball (YUKCHI)
  const female = isFemale(firstName, username);
  details.isFemale = female;
  if (!female) {
    score += 15;
  }

  // 5. Bitta yo'nalish (multi yo'q) = +20 ball (YUKCHI)
  const multiRoutes = hasMultipleRoutes(messageText);
  details.hasMultiRoutes = multiRoutes;
  if (!multiRoutes) {
    score += 20;
  }

  // Natija: 40+ ball = YUKCHI, aks holda DISPECHER
  const category = score >= 40 ? 'yukchi' : 'dispecher';

  return {
    category,
    score,
    details
  };
}

/**
 * Telefon raqamni extract qilish
 */
function extractPhone(text) {
  if (!text) return null;

  // Uzbekistan telefon raqamlari
  const patterns = [
    /\+998\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g,
    /998\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g,
    /\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g,
    /\+998\d{9}/g,
    /998\d{9}/g
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Raqamni formatlash
      let phone = matches[0].replace(/\s+/g, '');
      if (!phone.startsWith('+')) {
        phone = '+' + phone;
      }
      if (!phone.startsWith('+998')) {
        phone = '+998' + phone;
      }
      return phone;
    }
  }

  return null;
}

/**
 * Matnni formatlash (raqamsiz)
 */
function formatAnnouncement(text, category) {
  if (!text) return '';

  // Telefon raqamlarni o'chirish
  let formatted = text.replace(/\+?998\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g, '');
  formatted = formatted.replace(/\d{2}\s*\d{3}\s*\d{2}\s*\d{2}/g, '');

  // Ortiqcha bo'shliqlarni tozalash
  formatted = formatted.replace(/\s+/g, ' ').trim();

  // Emoji qo'shish
  const emoji = category === 'yukchi' ? '📦' : '🚗';

  return `${emoji} ${formatted}`;
}

module.exports = {
  classifyUser,
  extractPhone,
  formatAnnouncement,
  isFemale,
  hasLogisticsKeywords,
  hasMultipleRoutes
};
