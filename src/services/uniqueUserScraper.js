const { extractPhones } = require('./phoneExtractor');
const { getGroupById } = require('../database/models');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Global client reference
let telegramClient = null;

// Progress tracking
let currentProgress = {
  isRunning: false,
  groupName: '',
  totalMessages: 0,
  processedMessages: 0,
  uniqueUsers: 0,
  phonesFound: 0,
  startTime: null,
  messagesPerMinute: 0
};

/**
 * Client ni o'rnatish
 */
function setClient(client) {
  telegramClient = client;
}

/**
 * Progress ni olish
 */
function getUniqueProgress() {
  return { ...currentProgress };
}

/**
 * Sleep funksiyasi
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * TEZ SKAN - Har bir userdan FAQAT 1-2 ta raqam
 *
 * @param {number} groupId - Guruh ID
 * @param {Date} startDate - Boshlanish sana
 * @param {Date} endDate - Tugash sana
 * @param {number} maxPhonesPerUser - Har userdan max nechta raqam (default: 1)
 * @param {string} filename - Export fayl nomi
 */
async function scrapeUniqueUsers(groupId, startDate, endDate = new Date(), maxPhonesPerUser = 1, filename = null) {
  try {
    console.log(`\n⚡ TEZ SKAN boshlandi: Guruh ID=${groupId}`);
    console.log(`📅 Sana: ${startDate.toISOString()} -> ${endDate.toISOString()}`);
    console.log(`👤 Har userdan: ${maxPhonesPerUser} ta raqam`);

    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error(`Guruh topilmadi: ID ${groupId}`);
    }

    console.log(`✓ Guruh: ${group.name}`);

    // Telegram entity ni olish
    const entity = await telegramClient.getEntity(group.telegram_id);

    // Natijalar
    const results = {
      groupId,
      groupName: group.name,
      scrapedAt: new Date().toISOString(),
      totalMessages: 0,
      uniqueUsers: 0,
      totalPhones: 0,
      uniquePhones: 0,
      phones: [],
      filename: filename || `unique_users_${group.id}_${Date.now()}.json`
    };

    // User tracking - har userdan nechta raqam olganini kuzatish
    const userPhoneCount = new Map(); // userId -> phone count

    // Progress init
    currentProgress = {
      isRunning: true,
      groupName: group.name,
      totalMessages: 0,
      processedMessages: 0,
      uniqueUsers: 0,
      phonesFound: 0,
      startTime: Date.now(),
      messagesPerMinute: 0
    };

    let offsetId = 0;
    let offsetDate = Math.floor(endDate.getTime() / 1000);
    let continueScanning = true;
    let batchCount = 0;
    let batchSize = 100; // Kichikroq batch - tezroq

    console.log(`\n🚀 Skanerlash boshlandi...\n`);

    while (continueScanning) {
      // Xabarlarni olish
      const messages = await telegramClient.getMessages(entity, {
        limit: batchSize,
        offsetId: offsetId,
        offsetDate: offsetDate
      });

      if (messages.length === 0) {
        console.log(`📭 Xabarlar tugadi!`);
        break;
      }

      batchCount++;
      results.totalMessages += messages.length;
      console.log(`🔍 Batch #${batchCount} - ${messages.length} ta xabar`);

      // Har bir xabarni ko'rib chiqish
      for (const message of messages) {
        if (!message || !message.date) continue;

        // offsetId yangilash
        offsetId = message.id;
        offsetDate = message.date;

        // Sender ID ni AVVAL olish
        const senderId = message.senderId?.value?.toString() || message.fromId?.userId?.value?.toString() || 'unknown';

        // ✅ MUHIM: Bu userdan yetarli oldikmi tekshirish (xabarni ko'rmasdan turib!)
        const currentCount = userPhoneCount.get(senderId) || 0;

        if (currentCount >= maxPhonesPerUser) {
          // Bu userdan yetarli raqam oldik - SKIP (xabarni tekshirmaslik)
          continue;
        }

        // Faqat kerakli userlar uchun processedMessages ni oshirish
        currentProgress.processedMessages++;

        // Agar text yo'q bo'lsa, skip
        if (!message.text) continue;

        // Telefon raqamlarni topish (faqat kerakli userlar uchun)
        const phones = extractPhones(message.text);

        if (phones.length > 0) {
          // Raqamlarni qo'shish
          const phonesToAdd = phones.slice(0, maxPhonesPerUser - currentCount);

          for (const phone of phonesToAdd) {
            results.phones.push({
              phone,
              userId: senderId,
              group: group.name,
              message: message.text.substring(0, 100),
              date: new Date(message.date * 1000).toISOString()
            });

            results.totalPhones++;
          }

          // User count yangilash
          userPhoneCount.set(senderId, currentCount + phonesToAdd.length);

          // Agar yangi user bo'lsa
          if (currentCount === 0) {
            results.uniqueUsers++;
            currentProgress.uniqueUsers++;
          }
        }
      }

      // Progress update
      currentProgress.phonesFound = results.totalPhones;
      const elapsedMinutes = (Date.now() - currentProgress.startTime) / 60000;
      currentProgress.messagesPerMinute = Math.round(currentProgress.processedMessages / elapsedMinutes);

      // Unikal raqamlar soni (har batch)
      const uniqueNow = [...new Set(results.phones.map(p => p.phone))].length;
      results.uniquePhones = uniqueNow;

      // Log (har 3 batch - oddiy skanerlashdek)
      if (batchCount % 3 === 0) {
        console.log(`⚡ TEZ SKAN Progress: Batch #${batchCount} | ${results.totalMessages} jami xabar | ${currentProgress.processedMessages} tekshirildi | ${results.uniqueUsers} user | ${results.totalPhones} raqam (${uniqueNow} unikal) | ${currentProgress.messagesPerMinute} msg/min`);
      }

      // Sleep (Telegram API rate limit)
      await sleep(1000);
    }

    // Unikal raqamlarni hisoblash
    results.uniquePhones = [...new Set(results.phones.map(p => p.phone))].length;

    console.log(`\n✅ TEZ SKAN tugadi!`);
    console.log(`📊 Jami: ${results.totalMessages} xabar`);
    console.log(`👤 Unikal userlar: ${results.uniqueUsers}`);
    console.log(`📱 Jami raqamlar: ${results.totalPhones}`);
    console.log(`📱 Unikal raqamlar: ${results.uniquePhones}`);

    // Faylga saqlash
    await saveUniqueResults(results, results.filename);

    currentProgress.isRunning = false;

    return results;

  } catch (error) {
    logger.error('TEZ SKAN xato:', error);
    currentProgress.isRunning = false;
    throw error;
  }
}

/**
 * Natijalarni faylga saqlash (JSON, TXT, XLSX)
 */
async function saveUniqueResults(results, filename) {
  try {
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const baseFilename = filename.replace('.json', '');

    // 1. JSON fayl
    const jsonPath = path.join(exportDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`✅ JSON: ${baseFilename}.json`);

    // 2. TXT fayl - faqat raqamlar
    const txtPath = path.join(exportDir, `${baseFilename}.txt`);
    const uniquePhones = [...new Set(results.phones.map(p => p.phone))];
    fs.writeFileSync(txtPath, uniquePhones.join('\n'));
    console.log(`✅ TXT: ${baseFilename}.txt (${uniquePhones.length} unikal)`);

    // 3. XLSX fayl - to'liq ma'lumot
    const xlsxPath = path.join(exportDir, `${baseFilename}.xlsx`);
    const worksheetData = [
      ['Telefon', 'User ID', 'Guruh', 'Xabar', 'Sana']
    ];

    results.phones.forEach(item => {
      worksheetData.push([
        item.phone,
        item.userId,
        item.group,
        item.message,
        item.date
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Phones');
    XLSX.writeFile(workbook, xlsxPath);
    console.log(`✅ XLSX: ${baseFilename}.xlsx`);

    return {
      jsonPath,
      txtPath,
      xlsxPath
    };

  } catch (error) {
    logger.error('Faylni saqlashda xato:', error);
    throw error;
  }
}

module.exports = {
  setClient,
  scrapeUniqueUsers,
  getUniqueProgress,
  saveUniqueResults
};
