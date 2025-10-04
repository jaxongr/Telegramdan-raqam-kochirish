const { TelegramClient } = require('telegram');
const { extractPhones } = require('./phoneExtractor');
const { savePhone, getGroupById } = require('../database/models');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Global client reference (telegramClient dan olinadi)
let telegramClient = null;

// Progress tracking
let currentProgress = {
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  groupName: '',
  totalMessages: 0,
  processedMessages: 0,
  phonesFound: 0,
  uniquePhones: 0,
  startTime: null,
  lastUpdateTime: null,
  messagesPerMinute: 0,
  estimatedTimeLeft: 0
};

// Queue tizimi
let taskQueue = [];
let isProcessingQueue = false;

/**
 * Client ni o'rnatish
 */
function setClient(client) {
  telegramClient = client;
}

/**
 * Progress ni olish
 */
function getProgress() {
  return { ...currentProgress };
}

/**
 * Progress ni yangilash
 */
function updateProgress(updates) {
  currentProgress = { ...currentProgress, ...updates };
  currentProgress.lastUpdateTime = Date.now();

  // Tezlikni hisoblash
  if (currentProgress.startTime && currentProgress.processedMessages > 0) {
    const elapsedMinutes = (Date.now() - currentProgress.startTime) / 60000;
    currentProgress.messagesPerMinute = Math.round(currentProgress.processedMessages / elapsedMinutes);

    // Qolgan vaqtni taxmin qilish
    if (currentProgress.totalMessages > 0) {
      const remaining = currentProgress.totalMessages - currentProgress.processedMessages;
      currentProgress.estimatedTimeLeft = Math.round(remaining / (currentProgress.messagesPerMinute || 1));
    }
  }
}

/**
 * Guruh tarixini sana bo'yicha skanerlash
 * @param {number} groupId - Database dagi guruh ID
 * @param {Date} startDate - Boshlang'ich sana
 * @param {Date} endDate - Tugash sana (default: bugun)
 * @param {string} resumeFile - Davom ettirish fayli (optional)
 */
async function scrapeGroupHistoryByDate(groupId, startDate, endDate = new Date(), resumeFile = null, filename = null) {
  try {
    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error('Guruh topilmadi!');
    }

    // Resume ma'lumotlarini yuklash
    let resumeData = null;
    if (resumeFile && fs.existsSync(resumeFile)) {
      resumeData = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      logger.info(`📂 Resume fayli yuklandi: ${resumeData.processedMessages} xabar qayta ishlanadi`);
    }

    // Progress to'liq reset qilish (yangi skanerlash uchun)
    currentProgress = {
      isRunning: true,
      isPaused: false,
      shouldStop: false,
      groupName: group.name,
      totalMessages: 0,
      processedMessages: resumeData ? resumeData.processedMessages : 0,
      phonesFound: resumeData ? resumeData.phonesFound.length : 0,
      uniquePhones: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      messagesPerMinute: 0,
      estimatedTimeLeft: 0
    };

    logger.info(`📜 Sana bo'yicha skanerlash: ${group.name} (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`);

    // Telegram ID ni to'g'ri formatga keltirish
    let telegramId = group.telegram_id;
    if (!telegramId.startsWith('-')) {
      telegramId = `-100${telegramId}`;
    }

    // Channel/Group entity ni olish
    const entity = await telegramClient.getEntity(telegramId);

    const results = {
      groupName: group.name,
      totalMessages: 0,
      phonesFound: resumeData ? resumeData.phonesFound : [],
      messagesWithPhones: 0,
      errors: [],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filename: filename // Fayl nomi
    };

    // Kalit so'zlar
    const keywords = group.keywords ? group.keywords.split(',').map(k => k.trim()) : [];

    // Xabarlarni iteratsiya qilish (offset_date bilan)
    let offsetId = resumeData ? resumeData.lastMessageId : 0;
    let offsetDate = resumeData ? Math.floor(new Date(resumeData.lastMessageDate).getTime() / 1000) : Math.floor(endDate.getTime() / 1000);
    let continueScanning = true;
    let batchCount = 0;

    while (continueScanning) {
      // Stop yoki Pause tekshirish
      if (currentProgress.shouldStop) {
        logger.info('⏹️ Skanerlash to\'xtatildi (foydalanuvchi buyrug\'i)');
        break;
      }

      // Pause holatini tekshirish
      while (currentProgress.isPaused) {
        logger.info('⏸️ Skanerlash pauza qilindi...');
        await sleep(1000);
        if (currentProgress.shouldStop) {
          logger.info('⏹️ Skanerlash to\'xtatildi (pause holatida)');
          continueScanning = false;
          break;
        }
      }

      if (!continueScanning) break;

      // Xabarlarni olish (50 ta batch - API limit uchun kamaytirildi)
      const messages = await telegramClient.getMessages(entity, {
        limit: 50,
        offsetId: offsetId,
        offsetDate: offsetDate
      });

      if (messages.length === 0) {
        break;
      }

      batchCount++;
      results.totalMessages += messages.length;

      // Har bir xabarni ko'rib chiqish
      for (const message of messages) {
        try {
          if (!message || !message.text || !message.date) continue;

          // Sana tekshirish
          const msgDate = new Date(message.date * 1000);
          if (msgDate < startDate) {
            continueScanning = false;
            break;
          }

          const messageText = message.text.toLowerCase();

          // Kalit so'zni tekshirish
          if (keywords.length > 0) {
            let hasKeyword = false;
            for (const keyword of keywords) {
              if (keyword && messageText.includes(keyword.toLowerCase())) {
                hasKeyword = true;
                break;
              }
            }
            if (!hasKeyword) continue;
          }

          // Telefon raqamlarni topish
          const phones = extractPhones(message.text);

          if (phones.length > 0) {
            results.messagesWithPhones++;

            for (const phone of phones) {
              // Faqat results'ga qo'shish (database ga saqlamaslik - real-time bilan aralashmasligi uchun)
              results.phonesFound.push({
                phone,
                message: message.text.substring(0, 100),
                date: msgDate.toISOString()
              });
            }
          }

          // Progress yangilash
          const uniquePhones = [...new Set(results.phonesFound.map(p => p.phone))];
          updateProgress({
            processedMessages: currentProgress.processedMessages + 1,
            phonesFound: results.phonesFound.length,
            uniquePhones: uniquePhones.length
          });

          // Har 100 ta raqam topilganda asosiy faylni yangilash (backup emas!)
          if (results.phonesFound.length > 0 && results.phonesFound.length % 100 === 0) {
            logger.info(`💾 Progress: ${results.phonesFound.length} ta raqam topildi`);

            // Agar filename bo'lsa, shu faylni yangilash
            if (results.filename) {
              await saveResultsToFile(results, results.filename);
              logger.info(`✅ Auto-save: ${results.filename}`);
            }
          }

          // Oxirgi message ID va Date ni saqlash
          offsetId = message.id;
          offsetDate = message.date;

        } catch (msgError) {
          results.errors.push({
            message: msgError.message,
            messageId: message.id
          });
        }
      }

      // Resume faylni yangilash (har 100 xabar)
      if (resumeFile) {
        const resumeData = {
          groupId,
          groupName: group.name,
          processedMessages: currentProgress.processedMessages,
          phonesFound: results.phonesFound,
          lastMessageId: offsetId,
          lastMessageDate: new Date(offsetDate * 1000).toISOString(),
          timestamp: new Date().toISOString()
        };
        fs.writeFileSync(resumeFile, JSON.stringify(resumeData, null, 2));
      }

      // Progress log (har 100 xabar)
      if (batchCount % 1 === 0) {
        logger.info(`📊 Progress: ${currentProgress.processedMessages} xabar | ${results.phonesFound.length} raqam | ${currentProgress.messagesPerMinute} msg/min`);
      }

      // Telegram API rate limit (3 soniya kutish - xavfsizlik uchun)
      await sleep(3000);
    }

    // Progress tugallash
    updateProgress({ isRunning: false });

    logger.info(`✓ Skanerlash tugadi: ${results.phonesFound.length} ta raqam topildi`);

    return results;

  } catch (error) {
    updateProgress({ isRunning: false });
    logger.error('Tarixni skanerlashda xato:', error);
    throw error;
  }
}

/**
 * Eski funksiya (limit bilan) - compatibility uchun
 */
async function scrapeGroupHistory(groupId, messageLimit = 100) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // 30 kun oldin

  return await scrapeGroupHistoryByDate(groupId, startDate, endDate);
}

/**
 * Bir nechta guruhni skanerlash
 */
async function scrapeMultipleGroups(groupIds, messageLimit = 100) {
  const allResults = [];

  for (const groupId of groupIds) {
    try {
      const result = await scrapeGroupHistory(groupId, messageLimit);
      allResults.push(result);

      // Har bir guruh orasida 2 soniya kutish (rate limit oldini olish)
      await sleep(2000);
    } catch (error) {
      allResults.push({
        groupId,
        error: error.message
      });
    }
  }

  return allResults;
}

/**
 * Bir nechta guruhni sana bo'yicha skanerlash
 */
async function scrapeMultipleGroupsByDate(groupIds, startDate, endDate = new Date(), customFilename = null) {
  const allPhones = [];
  let totalMessages = 0;
  let totalMessagesWithPhones = 0;
  const groupResults = [];
  const errors = [];

  logger.info(`📚 Ko'p guruh skanerlash: ${groupIds.length} ta guruh`);

  // Progress to'liq reset qilish
  currentProgress = {
    isRunning: true,
    isPaused: false,
    shouldStop: false,
    groupName: `Guruh 1/${groupIds.length}`,
    totalMessages: 0,
    processedMessages: 0,
    phonesFound: 0,
    uniquePhones: 0,
    startTime: Date.now(),
    lastUpdateTime: Date.now(),
    messagesPerMinute: 0,
    estimatedTimeLeft: 0
  };

  for (let i = 0; i < groupIds.length; i++) {
    const groupId = groupIds[i];

    try {
      // Stop tekshirish
      if (currentProgress.shouldStop) {
        logger.info('⏹️ Ko\'p guruh skanerlash to\'xtatildi');
        break;
      }

      updateProgress({
        groupName: `Guruh ${i + 1}/${groupIds.length}`
      });

      logger.info(`📖 Guruh ${i + 1}/${groupIds.length} skanerlanyapti...`);

      const result = await scrapeGroupHistoryByDate(groupId, startDate, endDate);

      groupResults.push({
        groupName: result.groupName,
        totalMessages: result.totalMessages,
        phonesFound: result.phonesFound.length
      });

      // Barcha raqamlarni yig'ish
      allPhones.push(...result.phonesFound);
      totalMessages += result.totalMessages;
      totalMessagesWithPhones += result.messagesWithPhones;

      // Har bir guruh orasida 5 soniya kutish (API limit uchun)
      if (i < groupIds.length - 1) {
        logger.info('⏳ Keyingi guruhga o\'tishdan oldin 5 soniya kutish (API limit)...');
        await sleep(5000);
      }

    } catch (error) {
      logger.error(`Guruh ${groupId} skanerlashda xato:`, error);
      errors.push({
        groupId,
        error: error.message
      });
    }
  }

  updateProgress({ isRunning: false });

  const combinedResult = {
    totalGroups: groupIds.length,
    groupResults,
    totalMessages,
    messagesWithPhones: totalMessagesWithPhones,
    phonesFound: allPhones,
    errors,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };

  logger.info(`✓ Ko'p guruh skanerlash tugadi: ${allPhones.length} ta raqam topildi`);

  return combinedResult;
}

/**
 * Natijalarni faylga saqlash
 */
async function saveResultsToFile(results, filename = null) {
  try {
    const exportDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Agar results obyektida filename bo'lsa, uni ishlatamiz
    if (!filename && results.filename) {
      filename = results.filename;
    }

    if (!filename) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const timeStamp = Date.now();
      filename = `history_scrape_${timestamp}_${timeStamp}.json`;
    }

    const filePath = path.join(exportDir, filename);

    // Faqat telefon raqamlarni saqlash
    const phones = [];

    if (Array.isArray(results)) {
      // Ko'p guruh natijasi
      results.forEach(result => {
        if (result.phonesFound) {
          result.phonesFound.forEach(item => {
            phones.push({
              phone: item.phone,
              group: result.groupName,
              message: item.message,
              date: item.date
            });
          });
        }
      });
    } else {
      // Bitta guruh natijasi
      if (results.phonesFound) {
        results.phonesFound.forEach(item => {
          phones.push({
            phone: item.phone,
            group: results.groupName,
            message: item.message,
            date: item.date
          });
        });
      }
    }

    // JSON formatda saqlash
    fs.writeFileSync(filePath, JSON.stringify({
      scrapedAt: new Date().toISOString(),
      totalPhones: phones.length,
      phones: phones
    }, null, 2));

    // TXT formatda ham saqlash (faqat raqamlar)
    const txtFilename = filename.replace('.json', '.txt');
    const txtFilePath = path.join(exportDir, txtFilename);
    const uniquePhones = [...new Set(phones.map(p => p.phone))];
    fs.writeFileSync(txtFilePath, uniquePhones.join('\n'));

    // Excel formatda saqlash (takrorlanish soni bilan)
    const excelFilename = filename.replace('.json', '.xlsx');
    const excelFilePath = path.join(exportDir, excelFilename);

    // Takrorlanish sonini hisoblash
    const phoneCount = {};
    phones.forEach(p => {
      phoneCount[p.phone] = (phoneCount[p.phone] || 0) + 1;
    });

    // Excel uchun ma'lumot tayyorlash
    const excelData = Object.entries(phoneCount).map(([phone, count]) => ({
      'Telefon raqam': phone,
      'Takrorlanish soni': count,
      'Guruh': phones.find(p => p.phone === phone)?.group || '',
      'Sana': phones.find(p => p.phone === phone)?.date ? new Date(phones.find(p => p.phone === phone).date).toLocaleString('uz-UZ') : ''
    }));

    // Excel yaratish
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raqamlar');

    // Column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Telefon raqam
      { wch: 18 }, // Takrorlanish soni
      { wch: 30 }, // Guruh
      { wch: 20 }  // Sana
    ];

    XLSX.writeFile(workbook, excelFilePath);

    logger.info(`✓ Natijalar saqlandi: ${filePath}`);
    logger.info(`✓ TXT fayl saqlandi: ${txtFilePath}`);
    logger.info(`✓ Excel fayl saqlandi: ${excelFilePath}`);

    return {
      jsonFile: filename,
      txtFile: txtFilename,
      excelFile: excelFilename,
      totalPhones: phones.length,
      uniquePhones: uniquePhones.length
    };

  } catch (error) {
    logger.error('Faylga saqlashda xato:', error);
    throw error;
  }
}

/**
 * Sleep funksiyasi
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Export fayllardan statistikani hisoblash
 */
function getHistoryStats() {
  try {
    const exportDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportDir)) {
      return {
        totalExports: 0,
        totalPhones: 0,
        uniquePhones: 0,
        lastScrape: null
      };
    }

    const files = fs.readdirSync(exportDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('history_scrape_'));

    if (jsonFiles.length === 0) {
      return {
        totalExports: 0,
        totalPhones: 0,
        uniquePhones: 0,
        lastScrape: null
      };
    }

    let totalPhones = 0;
    const allPhones = new Set();
    let lastModified = null;

    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(exportDir, file);
        const stats = fs.statSync(filePath);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        totalPhones += content.totalPhones || 0;

        if (content.phones && Array.isArray(content.phones)) {
          content.phones.forEach(p => allPhones.add(p.phone));
        }

        if (!lastModified || stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      } catch (e) {
        // Skip faulty files
      }
    });

    return {
      totalExports: jsonFiles.length,
      totalPhones,
      uniquePhones: allPhones.size,
      lastScrape: lastModified ? lastModified.toLocaleDateString('uz-UZ') : null
    };

  } catch (error) {
    logger.error('History stats hisoblashda xato:', error);
    return {
      totalExports: 0,
      totalPhones: 0,
      uniquePhones: 0,
      lastScrape: null
    };
  }
}

/**
 * Skanerlashni to'xtatish
 */
function stopScraping() {
  if (currentProgress.isRunning) {
    currentProgress.shouldStop = true;
    logger.info('🛑 To\'xtatish buyrug\'i berildi...');
    return true;
  }
  return false;
}

/**
 * Skanerlashni pauza qilish
 */
function pauseScraping() {
  if (currentProgress.isRunning && !currentProgress.isPaused) {
    currentProgress.isPaused = true;
    logger.info('⏸️ Pauza buyrug\'i berildi...');
    return true;
  }
  return false;
}

/**
 * Skanerlashni davom ettirish
 */
function resumeScraping() {
  if (currentProgress.isRunning && currentProgress.isPaused) {
    currentProgress.isPaused = false;
    logger.info('▶️ Davom ettirish buyrug\'i berildi...');
    return true;
  }
  return false;
}

/**
 * Navbatga task qo'shish
 */
function addToQueue(task) {
  taskQueue.push(task);
  logger.info(`📥 Navbatga qo'shildi: ${task.name} (Navbatda: ${taskQueue.length})`);

  // Agar hozir ishlamayotgan bo'lsa, darhol boshlash
  if (!isProcessingQueue) {
    processQueue();
  }

  return {
    queuePosition: taskQueue.length,
    queueLength: taskQueue.length
  };
}

/**
 * Navbatni qayta ishlash
 */
async function processQueue() {
  if (isProcessingQueue) return;
  if (taskQueue.length === 0) return;

  isProcessingQueue = true;

  while (taskQueue.length > 0) {
    const task = taskQueue.shift();

    logger.info(`🔄 Navbatdan ishga tushirildi: ${task.name} (Qolgan: ${taskQueue.length})`);

    try {
      // Task ni bajarish
      const result = await task.execute();

      // Natijani saqlash
      await saveResultsToFile(result, task.filename);

      logger.info(`✅ Tugadi: ${task.name}`);
    } catch (error) {
      logger.error(`❌ Xato: ${task.name}`, error);
    }

    // Har bir task orasida 2 soniya kutish
    if (taskQueue.length > 0) {
      await sleep(2000);
    }
  }

  isProcessingQueue = false;
  logger.info('✅ Navbat tugadi!');
}

/**
 * Navbat holatini olish
 */
function getQueueStatus() {
  return {
    isProcessing: isProcessingQueue,
    queueLength: taskQueue.length,
    tasks: taskQueue.map((t, i) => ({
      position: i + 1,
      name: t.name
    }))
  };
}

module.exports = {
  setClient,
  scrapeGroupHistory,
  scrapeGroupHistoryByDate,
  scrapeMultipleGroups,
  scrapeMultipleGroupsByDate,
  saveResultsToFile,
  getProgress,
  getHistoryStats,
  stopScraping,
  pauseScraping,
  resumeScraping,
  addToQueue,
  getQueueStatus
};
