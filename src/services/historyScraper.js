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
  estimatedTimeLeft: 0,
  // Kunlar uchun progress
  totalDays: 0,
  processedDays: 0,
  currentDate: null,
  startDate: null,
  endDate: null
};

// Queue tizimi
let taskQueue = [];
let completedTasks = []; // Tugagan tasklar (1 soat saqlanadi)
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
    logger.info(`\n🚀 Skanerlash boshlandi: Guruh ID=${groupId}, Fayl=${filename || 'null'}`);

    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }
    logger.info(`✓ Telegram client ulangan`);

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error('Guruh topilmadi!');
    }
    logger.info(`✓ Guruh topildi: ${group.name}`);

    // Resume ma'lumotlarini yuklash yoki yaratish
    let resumeData = null;
    try {
      if (resumeFile && fs.existsSync(resumeFile)) {
        resumeData = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
        logger.info(`📂 Resume fayli yuklandi: ${resumeData.processedMessages} xabar qayta ishlanadi`);
      } else if (!resumeFile) {
        // Yangi resume fayl yaratish
        const { createResumeFile } = require('./autoResume');
        resumeFile = createResumeFile(groupId, group.name, {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          filename: filename
        });
      }
    } catch (resumeError) {
      logger.warn(`Resume fayl xatosi (e'tiborsiz qoldirildi): ${resumeError.message}`);
      resumeData = null;
      resumeFile = null;
    }

    // Kunlar orasidagi farqni hisoblash
    const totalDaysCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Progress to'liq reset qilish (yangi skanerlash uchun)
    currentProgress = {
      isRunning: true,
      isPaused: false,
      shouldStop: false,
      groupName: group.name,
      totalMessages: 0,
      processedMessages: resumeData ? resumeData.processedMessages : 0,
      phonesFound: resumeData ? (resumeData.phonesFoundCount || 0) : 0,
      uniquePhones: 0, // Oxirida hisoblanadi
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      messagesPerMinute: 0,
      estimatedTimeLeft: 0,
      // Kunlar
      totalDays: totalDaysCount,
      processedDays: 0,
      currentDate: endDate.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
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
      phonesFound: [], // Yangi raqamlar uchun
      messagesWithPhones: 0,
      errors: [],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      filename: filename // Fayl nomi
    };

    // BARCHA telefon raqamli xabarlarni olish - kalit so'z tekshiruvi YO'Q
    logger.info(`📱 [${group.name}] Barcha telefon raqamli xabarlarni skan qilish...`);

    // Xabarlarni iteratsiya qilish (offset_date bilan)
    let offsetId = resumeData ? resumeData.lastMessageId : 0;
    let offsetDate = resumeData ? Math.floor(new Date(resumeData.lastMessageDate).getTime() / 1000) : Math.floor(endDate.getTime() / 1000);
    let continueScanning = true;
    let batchCount = 0;

    // Adaptive rate limiting
    let currentBatchSize = 150; // Boshlang'ich batch
    let currentSleepMs = 600;   // Boshlang'ich sleep (ms)
    let floodWaitCount = 0;     // FLOOD_WAIT hisoblagich
    let successCount = 0;       // Muvaffaqiyatli so'rovlar

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

      // Xabarlarni olish (ADAPTIVE batch va sleep)
      let messages = [];
      let retryCount = 0;
      const maxRetries = 20; // Ko'proq retry - hech qachon to'xtamaydi

      while (retryCount < maxRetries) {
        try {
          // Har 10 batch da status ko'rsatish
          if (batchCount % 10 === 0) {
            logger.info(`🔍 [${group.name}] Batch #${batchCount + 1} - Size: ${currentBatchSize}, Sleep: ${currentSleepMs}ms`);
          }

          messages = await telegramClient.getMessages(entity, {
            limit: currentBatchSize, // Dynamic batch size
            offsetId: offsetId,
            offsetDate: offsetDate
          });

          if (batchCount % 10 === 0) {
            logger.info(`✓ [${group.name}] ${messages.length} ta xabar olindi`);
          }

          // ✅ MUVAFFAQIYATLI - tezlashtirish
          successCount++;
          floodWaitCount = 0; // Reset

          // Har 5 muvaffaqiyatli so'rovda tezlashtirish
          if (successCount >= 5) {
            successCount = 0;

            // Batch size ni oshirish (max 200)
            if (currentBatchSize < 200) {
              currentBatchSize = Math.min(200, currentBatchSize + 20);
            }

            // Sleep ni kamaytirish (min 400ms)
            if (currentSleepMs > 400) {
              currentSleepMs = Math.max(400, currentSleepMs - 100);
              logger.info(`⚡ Tezlashtirish: batch=${currentBatchSize}, sleep=${currentSleepMs}ms`);
            }
          }

          // Muvaffaqiyatli bo'lsa, retry loop dan chiqish
          break;

        } catch (apiError) {
          // ❌ FLOOD_WAIT - sekinlashtirish
          if (apiError.message && apiError.message.includes('FLOOD_WAIT')) {
            const waitSeconds = parseInt(apiError.message.match(/\d+/)?.[0] || 60);

            floodWaitCount++;
            successCount = 0; // Reset

            // ADAPTIVE: har safar sekinlashtirish
            currentBatchSize = Math.max(50, currentBatchSize - 30);
            currentSleepMs = Math.min(3000, currentSleepMs + 500);

            logger.warn(`🐌 FLOOD_WAIT #${floodWaitCount} - sekinlashtirish: batch=${currentBatchSize}, sleep=${currentSleepMs}ms`);
            logger.warn(`⏳ ${waitSeconds + 3}s kutish...`);

            await sleep((waitSeconds + 3) * 1000); // +3s xavfsizlik
            retryCount++;
            continue;

          } else if (apiError.message && apiError.message.includes('TIMEOUT')) {
            logger.warn(`⏳ TIMEOUT (retry ${retryCount + 1}): 10s kutish`);
            await sleep(10000);
            retryCount++;
            continue;

          } else {
            logger.error(`❌ [${group.name}] API xatosi:`, apiError.message);
            throw apiError;
          }
        }
      }

      // Agar max retry ga yetsa - sekinlashtir va davom et
      if (retryCount >= maxRetries && messages.length === 0) {
        logger.warn(`⚠️ Max retry (${maxRetries}), batch=50, sleep=5s bilan davom`);
        currentBatchSize = 50;
        currentSleepMs = 5000;
        retryCount = 0; // Reset - davom etish
      }

      if (messages.length === 0) {
        logger.info('📭 Xabarlar tugadi yoki oxiriga yetildi');
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

          // Telefon raqamlarni topish (kalit so'z tekshiruvisiz - BARCHA xabarlardan)
          const phones = extractPhones(message.text);

          if (phones.length > 0) {
            results.messagesWithPhones++;

            for (const phone of phones) {
              // Faqat results'ga qo'shish (database ga EMAS - tezlik uchun)
              results.phonesFound.push({
                phone,
                message: message.text.substring(0, 100),
                date: msgDate.toISOString()
              });
            }
          }

          // Progress yangilash (har 100 xabarda unikallashtirib ko'rsatish)
          const currentMsgDate = msgDate;
          const daysProcessed = Math.ceil((endDate - currentMsgDate) / (1000 * 60 * 60 * 24));

          // Har 100 xabarda unikal raqamlarni hisoblash
          let uniqueCount = currentProgress.uniquePhones;
          if (currentProgress.processedMessages % 100 === 0) {
            uniqueCount = [...new Set(results.phonesFound.map(p => p.phone))].length;
          }

          updateProgress({
            processedMessages: currentProgress.processedMessages + 1,
            phonesFound: results.phonesFound.length,
            uniquePhones: uniqueCount,
            processedDays: daysProcessed,
            currentDate: currentMsgDate.toISOString()
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

      // Resume faylni yangilash (har batch - faqat zarur ma'lumotlar)
      if (resumeFile) {
        try {
          const resumeData = {
            groupId,
            groupName: group.name,
            processedMessages: currentProgress.processedMessages,
            phonesFoundCount: results.phonesFound.length, // Faqat count
            lastMessageId: offsetId,
            lastMessageDate: new Date(offsetDate * 1000).toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            filename: filename,
            timestamp: new Date().toISOString()
          };
          fs.writeFileSync(resumeFile, JSON.stringify(resumeData, null, 2));
        } catch (resumeWriteError) {
          logger.warn(`Resume faylni yozishda xato (davom etadi): ${resumeWriteError.message}`);
        }
      }

      // Progress log (har batch)
      if (batchCount % 1 === 0) {
        const uniqueNow = [...new Set(results.phonesFound.map(p => p.phone))].length;
        logger.info(`📊 [${group.name}] Progress: ${currentProgress.processedMessages} xabar | ${results.phonesFound.length} raqam (${uniqueNow} unikal) | ${currentProgress.messagesPerMinute} msg/min`);
      }

      // Telegram API rate limit (ADAPTIVE sleep)
      await sleep(currentSleepMs);
    }

    // Oxirida unikallashtirib, uniquePhones ni yangilash
    const uniquePhonesCount = [...new Set(results.phonesFound.map(p => p.phone))].length;
    updateProgress({ uniquePhones: uniquePhonesCount });

    logger.info(`✓ [${group.name}] Skanerlash tugadi: ${results.phonesFound.length} ta raqam topildi (${uniquePhonesCount} unikal)`);

    // MUHIM: Progress faqat navbat tizimi tomonidan o'chirilsin!

    return results;

  } catch (error) {
    logger.error('Tarixni skanerlashda xato:', error);
    // Xato bo'lganda ham progress navbat tomonidan boshqariladi
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

      const result = await scrapeGroupHistoryByDate(groupId, startDate, endDate, null, customFilename);

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

    // Unikal raqamlarni hisoblash
    const uniquePhonesCount = [...new Set(phones.map(p => p.phone))].length;

    // JSON formatda saqlash
    fs.writeFileSync(filePath, JSON.stringify({
      scrapedAt: new Date().toISOString(),
      totalPhones: phones.length,
      uniquePhones: uniquePhonesCount,
      phones: phones
    }, null, 2));

    // TXT formatda ham saqlash (faqat raqamlar)
    const txtFilename = filename.replace('.json', '.txt');
    const txtFilePath = path.join(exportDir, txtFilename);
    const uniquePhonesArray = [...new Set(phones.map(p => p.phone))];
    fs.writeFileSync(txtFilePath, uniquePhonesArray.join('\n'));

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
  console.log(`📥 Navbatga qo'shildi: ${task.name} (Navbatda: ${taskQueue.length})`);
  logger.info(`📥 Navbatga qo'shildi: ${task.name} (Navbatda: ${taskQueue.length})`);

  // Agar hozir ishlamayotgan bo'lsa, darhol boshlash
  if (!isProcessingQueue) {
    processQueue();
  } else {
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
  if (isProcessingQueue) {
    logger.info('⚠️ Queue allaqachon ishlamoqda, kutilmoqda...');
    return;
  }
  if (taskQueue.length === 0) {
    logger.info('ℹ️ Queue bo\'sh');
    return;
  }

  isProcessingQueue = true;
  logger.info(`\n▶️ Queue ishga tushirildi - ${taskQueue.length} ta task`);

  try {
    while (taskQueue.length > 0) {
      const task = taskQueue.shift();

      console.log(`🔄 Navbatdan ishga tushirildi: ${task.name}`);
      logger.info(`\n🔄 Navbatdan ishga tushirildi: ${task.name}`);
      logger.info(`   📋 Qolgan navbatda: ${taskQueue.length} ta task`);

      try {
        // Task ni bajarish
        logger.info(`⏳ Task bajarilmoqda: ${task.name}`);
        logger.info(`   🎯 Execute funksiyasi chaqirilmoqda...`);

        const result = await task.execute();

        logger.info(`✅ Task bajarildi: ${task.name} - ${result.phonesFound?.length || 0} ta raqam`);

      // Unikal raqamlarni hisoblash
      const uniqueCount = [...new Set(result.phonesFound.map(p => p.phone))].length;

      // Natijani saqlash
      const savedFiles = await saveResultsToFile(result, task.filename);

      logger.info(`\n✅ TUGADI: ${task.name}`);
      logger.info(`   📊 Topildi: ${result.phonesFound?.length || 0} ta raqam`);
      logger.info(`   🔢 Unikal: ${uniqueCount} ta`);
      logger.info(`   📁 Fayllar: ${savedFiles.jsonFile}, ${savedFiles.txtFile}, ${savedFiles.excelFile}`);
      logger.info(`   ⏰ Task 1 soat saqlanadi\n`);

      // Resume faylni o'chirish (agar mavjud bo'lsa)
      if (task.resumeFile) {
        const { deleteResumeFile } = require('./autoResume');
        deleteResumeFile(task.resumeFile);
      }

      // Task natijasini 1 soat saqlash
      task.completedAt = Date.now();
      task.result = {
        totalPhones: result.phonesFound?.length || 0,
        uniquePhones: uniqueCount,
        files: savedFiles
      };
      completedTasks.push(task);

      // 1 soatdan eski tasklarni tozalash
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      completedTasks = completedTasks.filter(t => t.completedAt > oneHourAgo);

    } catch (error) {
      logger.error(`\n❌ XATO: ${task.name}`);
      logger.error(`   💥 Sabab: ${error.message}\n`);

      // Xatoli taskni ham saqlash
      task.completedAt = Date.now();
      task.error = error.message;
      completedTasks.push(task);
    }

      // Har bir task orasida 5 soniya kutish
      if (taskQueue.length > 0) {
        logger.info(`⏳ Keyingi task 5 soniyada boshlanadi...\n`);
        await sleep(5000);
      }
    }

    // Barcha tasklar tugadi - endi progress ni o'chirish
    isProcessingQueue = false;
    updateProgress({ isRunning: false });
    logger.info('✅ Barcha navbat tugadi!\n');

  } catch (queueError) {
    logger.error(`\n💥 Queue jarayonida xato:`);
    logger.error(queueError);
    logger.error(queueError.stack);

    // Queue ni reset qilish
    isProcessingQueue = false;
    updateProgress({ isRunning: false });
  }
}

/**
 * Navbat holatini olish
 */
function getQueueStatus() {
  // 1 soatdan eski tasklarni tozalash
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  completedTasks = completedTasks.filter(t => t.completedAt > oneHourAgo);

  return {
    isProcessing: isProcessingQueue,
    queueLength: taskQueue.length,
    pendingTasks: taskQueue.map((t, i) => ({
      position: i + 1,
      name: t.name,
      status: 'navbatda'
    })),
    completedTasks: completedTasks.map(t => ({
      name: t.name,
      status: t.error ? 'xato' : 'tugadi',
      completedAt: new Date(t.completedAt).toLocaleString('uz-UZ'),
      result: t.result || null,
      error: t.error || null,
      expiresIn: Math.round((t.completedAt + 60 * 60 * 1000 - Date.now()) / 60000) + ' daqiqa'
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
