// DEMO MODE - Telegram API kerak emas

const logger = require('../utils/logger');

let isMonitoring = false;

// Demo uchun kalit so'zlar
const KEYWORDS = [
  'yuk bor', 'yuklar bor', 'yuk kerak', 'yuk tashiyman', 'mashina bor', 'mashina kerak',
  'transport bor', 'transport kerak', 'haydovchi kerak', 'isuzu bor', 'kamaz bor', 'man bor',
  'tent bor', 'fura bor', 'fura kerak', 'trailer bor', 'konteyner bor', 'tonna yuk',
  'tonnali yuk', 'tovar bor', 'tovar kerak', "jo'natma bor", 'tashish kerak', 'tashish uchun',
  'arzon', 'narx kelishiladi', 'pullik', 'tez', 'zudlik bilan', 'shoshilinch', 'darhol',
  'bugun', 'ertaga', 'yetkazib berish', 'yuklash', 'tushirish', 'ombor', 'sklad', 'zavod',
  'toshkent', 'samarqand', 'buxoro', 'andijon', "farg'ona", 'namangan', 'qashqadaryo',
  'surxondaryo', 'jizzax', 'navoiy', 'xorazm', 'moskva', 'rossiya', "qozog'iston",
  'sement', 'tsement', 'pilomaterial', "g'isht", 'qum', 'beton', 'oziq-ovqat', 'mebel',
  'texnika', 'qurilish'
];

/**
 * DEMO: Telegram client ni boshlash
 */
async function startTelegramClient() {
  logger.info('DEMO MODE: Telegram client simulyatsiya qilinmoqda...');
  return { connected: true };
}

/**
 * DEMO: Monitoring
 */
async function startMonitoring() {
  isMonitoring = true;
  logger.info('DEMO MODE: Monitoring faollashtirildi');
}

/**
 * Kalit so'zlarni tekshirish
 */
function checkKeywords(text, customKeywords = '') {
  const textLower = text.toLowerCase();

  for (const keyword of KEYWORDS) {
    if (textLower.includes(keyword)) {
      return true;
    }
  }

  if (customKeywords && customKeywords.trim()) {
    const customList = customKeywords.split(',').map(k => k.trim().toLowerCase());
    for (const keyword of customList) {
      if (keyword && textLower.includes(keyword)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * DEMO: Monitoring to'xtatish
 */
async function stopMonitoring() {
  isMonitoring = false;
  logger.info('Monitoring to\'xtatildi');
}

/**
 * DEMO: Client disconnect
 */
async function disconnectClient() {
  logger.info('DEMO MODE: Telegram client disconnect');
}

/**
 * DEMO: Guruh qo'shish
 */
async function joinGroup(inviteLink) {
  logger.info('DEMO MODE: Guruhga qo\'shilish:', inviteLink);
  return { success: true };
}

/**
 * DEMO: Dialoglar
 */
async function getDialogs() {
  return [
    { id: '1001', name: 'Logistika Toshkent', isGroup: true, isChannel: false },
    { id: '1002', name: 'Yuk Tashish', isGroup: true, isChannel: false },
    { id: '1003', name: 'Transport', isGroup: true, isChannel: false }
  ];
}

/**
 * Client status
 */
function getClientStatus() {
  return {
    connected: true, // Demo uchun har doim true
    monitoring: isMonitoring
  };
}

module.exports = {
  startTelegramClient,
  startMonitoring,
  stopMonitoring,
  disconnectClient,
  joinGroup,
  getDialogs,
  getClientStatus,
  checkKeywords,
  KEYWORDS
};
