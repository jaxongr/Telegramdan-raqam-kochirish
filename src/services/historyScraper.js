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

// Navbatni faylga saqlash uchun (persistence)
const queueFilePath = path.join(__dirname, '../../data/queue.json');

// Navbatni yuklash
function loadQueue() {
  try {
    if (fs.existsSync(queueFilePath)) {
      const data = JSON.parse(fs.readFileSync(queueFilePath, 'utf8'));
      logger.info(`✓ Navbat fayldan yuklandi: ${data.pending?.length || 0} ta task`);

      // MUHIM: execute funksiyasini qayta yaratish (JSON'da saqlanmaydi)
      // Restart'dan keyin tasklar yo'qoladi - faqat info ko'rsatish uchun
      // Real implementation: Resume tizimi yordamida
    }
  } catch (error) {
    logger.warn('Navbatni yuklashda xato:', error.message);
  }
}

// Navbatni saqlash
function saveQueue() {
  try {
    const dataDir = path.join(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Faqat task metadata'ni saqlash (execute funksiyasiz)
    const queueData = taskQueue.map(t => ({
      id: t.id,
      name: t.name,
      filename: t.filename,
      addedAt: t.addedAt
    }));

    fs.writeFileSync(queueFilePath, JSON.stringify({
      pending: queueData,
      savedAt: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    logger.warn('Navbatni saqlashda xato:', error.message);
  }
}

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
    // MUHIM: Sanalarni tekshirish va agar teskari bo'lsa, swap qilish
    if (startDate > endDate) {
      console.log(`⚠️ SANA TESKARI: ${startDate.toISOString()} > ${endDate.toISOString()} - Avtomatik swap`);
      logger.warn(`Sanalar teskari - swap qilindi`);
      [startDate, endDate] = [endDate, startDate];
    }

    console.log(`\n🚀 Skanerlash boshlandi: Guruh ID=${groupId}, Fayl=${filename || 'null'}`);
    console.log(`📅 Sana: ${startDate.toISOString()} -> ${endDate.toISOString()}`);
    logger.info(`\n🚀 Skanerlash boshlandi: Guruh ID=${groupId}, Fayl=${filename || 'null'}`);

    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }
    console.log(`✓ Telegram client ulangan`);
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
      }
      // RESUME YARATISH O'CHIRILDI - user so'rovi bo'yicha
      // else if (!resumeFile) {
      //   // Yangi resume fayl yaratish
      //   const { createResumeFile } = require('./autoResume');
      //   resumeFile = createResumeFile(groupId, group.name, {
      //     startDate: startDate.toISOString(),
      //     endDate: endDate.toISOString(),
      //     filename: filename
      //   });
      // }
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
          // Debug log
          console.log(`🔍 Batch #${batchCount + 1} - getMessages(limit=${currentBatchSize}, offsetId=${offsetId}, offsetDate=${offsetDate})`);

          // Har 10 batch da status ko'rsatish
          if (batchCount % 10 === 0) {
            logger.info(`🔍 [${group.name}] Batch #${batchCount + 1} - Size: ${currentBatchSize}, Sleep: ${currentSleepMs}ms`);
          }

          messages = await telegramClient.getMessages(entity, {
            limit: currentBatchSize, // Dynamic batch size
            offsetId: offsetId,
            offsetDate: offsetDate
          });

          console.log(`✓ Batch #${batchCount + 1} - ${messages.length} ta xabar keldi`);

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
        console.log(`📭 Xabarlar tugadi! batchCount=${batchCount}, offsetId=${offsetId}, offsetDate=${offsetDate}`);
        logger.info('📭 Xabarlar tugadi yoki oxiriga yetildi');
        break;
      }

      batchCount++;
      results.totalMessages += messages.length;

      // Har bir xabarni ko'rib chiqish
      for (const message of messages) {
        try {
          if (!message || !message.date) continue;

          // MUHIM: offsetId va offsetDate ni DOIM yangilash (loop davom etishi uchun)
          offsetId = message.id;
          offsetDate = message.date;

          // Xabar sanasi
          const msgDate = new Date(message.date * 1000);

          // MUHIM: processedMessages ni DOIM yangilash (text bo'lmasa ham)
          const daysProcessed = Math.ceil((endDate - msgDate) / (1000 * 60 * 60 * 24));

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
            currentDate: msgDate.toISOString()
          });

          // Agar text yo'q bo'lsa, telefon raqam ham yo'q - keyingisiga o'tamiz
          if (!message.text) continue;

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

          // HAR 1000 TA RAQAMDA FAYLGA SAQLASH (server o'chsa tiklanadi!)
          if (results.phonesFound.length > 0 && results.phonesFound.length % 1000 === 0) {
            logger.info(`💾 BACKUP: ${results.phonesFound.length} ta raqam faylga saqlandi`);

            if (results.filename) {
              await saveResultsToFile(results, results.filename);
              logger.info(`✅ Auto-save: ${results.filename}`);
            }
          }

          // HAR 100 TA RAQAMDA FAQAT LOG (juda tez!)
          if (results.phonesFound.length > 0 && results.phonesFound.length % 100 === 0 && results.phonesFound.length % 1000 !== 0) {
            logger.info(`📊 Progress: ${results.phonesFound.length} ta raqam`);
          }

        } catch (msgError) {
          results.errors.push({
            message: msgError.message,
            messageId: message.id
          });
        }
      }

      // OLIB TASHLANDI: 30-day check (user eski xabarlarni skanerlashi mumkin)

      // RESUME YANGILASH O'CHIRILDI - user so'rovi bo'yicha
      // // Resume faylni yangilash (har batch - faqat zarur ma'lumotlar)
      // if (resumeFile) {
      //   try {
      //     const resumeData = {
      //       groupId,
      //       groupName: group.name,
      //       processedMessages: currentProgress.processedMessages,
      //       phonesFoundCount: results.phonesFound.length, // Faqat count
      //       lastMessageId: offsetId,
      //       lastMessageDate: new Date(offsetDate * 1000).toISOString(),
      //       startDate: startDate.toISOString(),
      //       endDate: endDate.toISOString(),
      //       filename: filename,
      //       timestamp: new Date().toISOString()
      //     };
      //     fs.writeFileSync(resumeFile, JSON.stringify(resumeData, null, 2));
      //   } catch (resumeWriteError) {
      //     logger.warn(`Resume faylni yozishda xato (davom etadi): ${resumeWriteError.message}`);
      //   }
      // }

      // Progress log (har 3 batch)
      if (batchCount % 3 === 0) {
        const uniqueNow = [...new Set(results.phonesFound.map(p => p.phone))].length;
        const queueInfo = getQueueStatus();
        const navbatText = queueInfo.pendingTasks.length > 0 ? `Navbat: ${queueInfo.pendingTasks.length}` : '';
        const kunlarText = currentProgress.totalDays > 0 ? `${currentProgress.processedDays}/${currentProgress.totalDays} kun` : '';

        console.log(`📊 Progress: Batch #${batchCount} | ${currentProgress.processedMessages} xabar | ${results.phonesFound.length} raqam (${uniqueNow} unikal) | ${currentProgress.messagesPerMinute} msg/min | ${kunlarText} ${navbatText}`);
      }

      // Telegram API rate limit (ADAPTIVE sleep)
      await sleep(currentSleepMs);
    }

    // UNIKALLASH: Faqat birinchi ko'rinishini saqlash (Map bilan - tezroq!)
    logger.info(`🔍 Dublikatlarni chiqarilmoqda: ${results.phonesFound.length} ta raqam...`);

    const uniquePhonesMap = new Map();
    for (const phoneData of results.phonesFound) {
      if (!uniquePhonesMap.has(phoneData.phone)) {
        uniquePhonesMap.set(phoneData.phone, phoneData);
      }
    }

    const uniquePhones = Array.from(uniquePhonesMap.values());
    const uniquePhonesCount = uniquePhones.length;
    const duplicateCount = results.phonesFound.length - uniquePhonesCount;

    updateProgress({ uniquePhones: uniquePhonesCount });

    logger.info(`✓ [${group.name}] Skanerlash tugadi: ${results.phonesFound.length} ta raqam topildi`);
    logger.info(`  → ${uniquePhonesCount} unikal, ${duplicateCount} dublikat (chiqarildi)`);

    // OXIRIDA FAQAT UNIKAL RAQAMLARNI DATABASE GA SAQLASH (JUDA TEZ!)
    if (uniquePhones.length > 0) {
      try {
        logger.info(`💾 Database ga saqlash boshlandi: ${uniquePhones.length} ta UNIKAL raqam...`);
        const { savePhonesInBatch } = require('../database/models');

        // 1000 talik batchlarga bo'lib saqlash
        const BATCH_SIZE = 1000;
        let totalInserted = 0;
        let totalUpdated = 0;

        for (let i = 0; i < uniquePhones.length; i += BATCH_SIZE) {
          const batch = uniquePhones.slice(i, i + BATCH_SIZE);
          const dbResult = await savePhonesInBatch(batch.map(p => ({
            phone: p.phone,
            group_id: groupId,
            message: p.message,
            date: p.date
          })));

          totalInserted += dbResult.inserted || 0;
          totalUpdated += dbResult.updated || 0;

          if (i + BATCH_SIZE < uniquePhones.length) {
            logger.info(`  → ${i + batch.length}/${uniquePhones.length} saqlandi...`);
          }
        }

        logger.info(`✅ Database saqlash tugadi: ${totalInserted} yangi, ${totalUpdated} yangilandi`);
        logger.info(`⚡ Optimizatsiya: ${duplicateCount} ta dublikat o'tkazib yuborildi (${Math.round(duplicateCount/results.phonesFound.length*100)}% tejov)`);
      } catch (dbError) {
        logger.error(`❌ Database save error: ${dbError.message}`);
      }
    }

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
      uniquePhones: uniquePhonesCount
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

// Cache uchun global o'zgaruvchilar
let historyStatsCache = null;
let historyStatsCacheTime = 0;
const HISTORY_STATS_CACHE_DURATION = 2 * 60 * 1000; // 2 daqiqa (tezlik uchun)

/**
 * Export fayllardan statistikani hisoblash (OPTIMIZATSIYA - FAQAT METADATA)
 */
function getHistoryStats() {
  try {
    const now = Date.now();

    // Cache tekshirish - 5 minut
    if (historyStatsCache && (now - historyStatsCacheTime) < HISTORY_STATS_CACHE_DURATION) {
      return historyStatsCache;
    }

    const exportDir = path.join(__dirname, '../../exports');

    if (!fs.existsSync(exportDir)) {
      historyStatsCache = {
        totalExports: 0,
        totalPhones: 0,
        uniquePhones: 0,
        lastScrape: null
      };
      historyStatsCacheTime = now;
      return historyStatsCache;
    }

    const files = fs.readdirSync(exportDir);
    const jsonFiles = files.filter(file => file.endsWith('.json') && file.startsWith('history_scrape_'));

    if (jsonFiles.length === 0) {
      historyStatsCache = {
        totalExports: 0,
        totalPhones: 0,
        uniquePhones: 0,
        lastScrape: null
      };
      historyStatsCacheTime = now;
      return historyStatsCache;
    }

    let totalPhones = 0;
    let uniquePhones = 0;
    let lastModified = null;

    // OPTIMIZATSIYA: Faqat birinchi 2000 bayt o'qish (metadata uchun yetarli)
    jsonFiles.forEach(file => {
      try {
        const filePath = path.join(exportDir, file);
        const stats = fs.statSync(filePath);

        // Faqat metadata o'qish (to'liq faylni emas!)
        const fd = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(2000);
        fs.readSync(fd, buffer, 0, 2000, 0);
        fs.closeSync(fd);

        const fileContent = buffer.toString('utf8');

        // Regex bilan metadata qidirish (juda tez!)
        const totalMatch = fileContent.match(/"totalPhones"\s*:\s*(\d+)/);
        const uniqueMatch = fileContent.match(/"uniquePhones"\s*:\s*(\d+)/);

        if (totalMatch) totalPhones += parseInt(totalMatch[1]);
        if (uniqueMatch) uniquePhones += parseInt(uniqueMatch[1]);

        if (!lastModified || stats.mtime > lastModified) {
          lastModified = stats.mtime;
        }
      } catch (e) {
        // Skip faulty files
      }
    });

    historyStatsCache = {
      totalExports: jsonFiles.length,
      totalPhones,
      uniquePhones,
      lastScrape: lastModified ? lastModified.toLocaleDateString('uz-UZ') : null
    };
    historyStatsCacheTime = now;

    return historyStatsCache;

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
  // Har bir taskga unique ID qo'shish
  task.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  task.addedAt = Date.now();

  taskQueue.push(task);
  console.log(`📥 Navbatga qo'shildi: ${task.name} (ID: ${task.id}, Navbatda: ${taskQueue.length})`);
  logger.info(`📥 Navbatga qo'shildi: ${task.name} (ID: ${task.id}, Navbatda: ${taskQueue.length})`);

  // Navbatni faylga saqlash
  saveQueue();

  // Agar hozir ishlamayotgan bo'lsa, darhol boshlash
  if (!isProcessingQueue) {
    logger.info(`🚀 processQueue() chaqirilmoqda...`);
    // Async funksiya - promise catch qilish
    processQueue().catch(err => {
      logger.error(`💥 processQueue() crash:`, err);
      logger.error(err.stack);
      // Queue ni reset qilish
      isProcessingQueue = false;
    });
  } else {
    logger.info(`⏳ Queue allaqachon ishlamoqda (isProcessingQueue=true)`);
  }

  return {
    queuePosition: taskQueue.length,
    queueLength: taskQueue.length,
    taskId: task.id
  };
}

/**
 * Navbatdan taskni o'chirish
 */
function removeFromQueue(taskId) {
  const index = taskQueue.findIndex(t => t.id === taskId);

  if (index === -1) {
    logger.warn(`❌ Task topilmadi: ${taskId}`);
    return {
      success: false,
      message: 'Task topilmadi yoki allaqachon ishga tushdi'
    };
  }

  const task = taskQueue.splice(index, 1)[0];
  logger.info(`🗑️ Navbatdan o'chirildi: ${task.name} (ID: ${taskId})`);

  // Navbatni faylga saqlash
  saveQueue();

  return {
    success: true,
    message: `${task.name} navbatdan o'chirildi`,
    taskName: task.name
  };
}

/**
 * Navbatni qayta ishlash
 */
async function processQueue() {
  console.log('🔥 [DEBUG] processQueue() BOSHLANDI');
  console.log(`🔥 [DEBUG] isProcessingQueue=${isProcessingQueue}, taskQueue.length=${taskQueue.length}`);

  if (isProcessingQueue) {
    console.log('⚠️ Queue allaqachon ishlamoqda, kutilmoqda...');
    logger.info('⚠️ Queue allaqachon ishlamoqda, kutilmoqda...');
    return;
  }
  if (taskQueue.length === 0) {
    console.log('ℹ️ Queue bo\'sh');
    logger.info('ℹ️ Queue bo\'sh');
    return;
  }

  isProcessingQueue = true;
  console.log(`\n▶️ Queue ishga tushirildi - ${taskQueue.length} ta task`);
  logger.info(`\n▶️ Queue ishga tushirildi - ${taskQueue.length} ta task`);

  try {
    while (taskQueue.length > 0) {
      const task = taskQueue.shift();

      // Navbatni faylga saqlash (task olingandan keyin)
      saveQueue();

      console.log(`🔄 Navbatdan ishga tushirildi: ${task.name}`);
      logger.info(`\n🔄 Navbatdan ishga tushirildi: ${task.name}`);
      logger.info(`   📋 Qolgan navbatda: ${taskQueue.length} ta task`);

      try {
        // Task ni bajarish
        console.log(`⏳ Task bajarilmoqda: ${task.name}`);
        console.log(`   🎯 Execute funksiyasi chaqirilmoqda...`);
        logger.info(`⏳ Task bajarilmoqda: ${task.name}`);
        logger.info(`   🎯 Execute funksiyasi chaqirilmoqda...`);

        const result = await task.execute();
        console.log(`✅ Execute tugadi! phonesFound=${result.phonesFound?.length || 0}`);

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
      console.log(`\n❌ TASK XATO: ${task.name} - ${error.message}`);
      console.log(error.stack);
      logger.error(`\n❌ XATO: ${task.name}`);
      logger.error(`   💥 Sabab: ${error.message}\n`);
      logger.error(error.stack);

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
    console.log(`\n💥 QUEUE XATO:`, queueError.message);
    console.log(queueError.stack);
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
      id: t.id,
      position: i + 1,
      name: t.name,
      status: 'navbatda',
      addedAt: new Date(t.addedAt).toLocaleString('uz-UZ', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
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

/**
 * Guruhdagi xabarlar sanasini tekshirish
 * @param {number} groupId - Database dagi guruh ID
 * @returns {Object} - Eng eski va eng yangi xabar sanalari
 */
async function checkGroupMessageRange(groupId) {
  try {
    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error('Guruh topilmadi!');
    }

    logger.info(`📊 Guruh sanalarini tekshirish: ${group.name} (ID: ${group.telegram_id})`);

    // Telegram entity ni olish
    const entity = await telegramClient.getEntity(group.telegram_id);

    // Jami xabarlar sonini olish
    let totalMessages = 0;
    try {
      const { Api } = require('telegram/tl');
      const fullChat = await telegramClient.invoke(
        new Api.channels.GetFullChannel({ channel: entity })
      );

      // Total messages count (approximation - some may be deleted)
      // We'll use the ID of the latest message as a proxy
      const latestMessages = await telegramClient.getMessages(entity, { limit: 1 });
      if (latestMessages && latestMessages.length > 0) {
        totalMessages = latestMessages[0].id;
      }
    } catch (e) {
      logger.warn(`⚠️ Jami xabarlar sonini olishda xato: ${e.message}`);
    }

    // Eng yangi xabarlarni olish (oxiridan)
    const recentMessages = await telegramClient.getMessages(entity, {
      limit: 5
    });

    // Eng eski xabarlarni olish (boshidan)
    const oldMessages = await telegramClient.getMessages(entity, {
      limit: 5,
      offsetId: 1,
      reverse: true
    });

    let oldestDate = null;
    let newestDate = null;

    // Eng eski sanani topish
    if (oldMessages && oldMessages.length > 0) {
      const dates = oldMessages
        .filter(m => m && m.date)
        .map(m => new Date(m.date * 1000));

      if (dates.length > 0) {
        oldestDate = new Date(Math.min(...dates));
      }
    }

    // Eng yangi sanani topish
    if (recentMessages && recentMessages.length > 0) {
      const dates = recentMessages
        .filter(m => m && m.date)
        .map(m => new Date(m.date * 1000));

      if (dates.length > 0) {
        newestDate = new Date(Math.max(...dates));
      }
    }

    const result = {
      groupId: group.id,
      groupName: group.name,
      telegramId: group.telegram_id,
      oldestMessage: oldestDate ? oldestDate.toISOString() : null,
      newestMessage: newestDate ? newestDate.toISOString() : null,
      oldestDateFormatted: oldestDate ? oldestDate.toLocaleDateString('uz-UZ') : 'Noma\'lum',
      newestDateFormatted: newestDate ? newestDate.toLocaleDateString('uz-UZ') : 'Noma\'lum',
      totalMessages: totalMessages,
      messageCount: {
        recent: recentMessages.length,
        oldest: oldMessages.length
      }
    };

    logger.info(`✓ Sana oralig'i: ${result.oldestDateFormatted} - ${result.newestDateFormatted} | Jami: ~${totalMessages.toLocaleString()} xabar`);

    return result;

  } catch (error) {
    logger.error('Guruh sanalarini tekshirishda xato:', error);
    throw error;
  }
}

// Modul yuklanganda navbatni tiklash
loadQueue();

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
  removeFromQueue,
  getQueueStatus,
  checkGroupMessageRange
};
