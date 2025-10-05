const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { scrapeGroupHistoryByDate, addToQueue } = require('./historyScraper');

const resumeDir = path.join(__dirname, '../../data/resume');

/**
 * Server qayta yonganda skanerlashni avtomatik davom ettirish
 */
async function checkAndResumeScans() {
  try {
    if (!fs.existsSync(resumeDir)) {
      return;
    }

    const files = fs.readdirSync(resumeDir);
    const resumeFiles = files.filter(f => f.startsWith('resume_') && f.endsWith('.json'));

    if (resumeFiles.length === 0) {
      logger.info('📂 Resume fayllar topilmadi');
      return;
    }

    logger.info(`📂 ${resumeFiles.length} ta resume fayl topildi`);

    // Fayllarni timestamp bo'yicha sortlash (eng yangi birinchi)
    const sortedFiles = resumeFiles.map(file => {
      const filePath = path.join(resumeDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return {
        file,
        filePath,
        data,
        timestamp: new Date(data.timestamp || 0).getTime()
      };
    }).sort((a, b) => b.timestamp - a.timestamp); // Eng yangi birinchi

    logger.info(`🔄 Eng yangi resume: ${sortedFiles[0]?.file}`);

    // Faqat ENG YANGI resume faylni qayta ishlash, eski fayllarni o'chirish
    for (let i = 0; i < sortedFiles.length; i++) {
      const { file, filePath, data: resumeData, timestamp } = sortedFiles[i];

      try {
        // Vaqtni tekshirish - 24 soatdan eski bo'lsa o'chirish
        const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

        if (hoursSince > 24) {
          logger.info(`🗑 Eski resume fayl o'chirildi: ${file} (${hoursSince.toFixed(1)} soat oldin)`);
          fs.unlinkSync(filePath);
          continue;
        }

        // Agar bu birinchi (eng yangi) fayl emas bo'lsa, o'chirib yuborish
        if (i > 0) {
          logger.info(`🗑 Eski resume fayl o'chirildi (yangi bor): ${file}`);
          fs.unlinkSync(filePath);
          continue;
        }

        // Eski filename ni olish yoki yangi yaratish
        const originalFilename = resumeData.filename || `history_scrape_resumed_${resumeData.groupName}_${Date.now()}.json`;

        logger.info(`▶️ Davom ettirish: ${resumeData.groupName}`);
        logger.info(`   📊 ${resumeData.processedMessages} xabar bajarilgan`);
        logger.info(`   📝 Fayl: ${originalFilename}`);

        // Navbatga qo'shish
        const task = {
          name: `Resume: ${resumeData.groupName}`,
          filename: originalFilename,
          execute: async () => {
            const startDate = new Date(resumeData.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            const endDate = new Date(resumeData.endDate || new Date());

            return await scrapeGroupHistoryByDate(
              resumeData.groupId,
              startDate,
              endDate,
              filePath, // resume fayl
              originalFilename // O'sha fayl nomini davom ettirish
            );
          }
        };

        addToQueue(task);

      } catch (error) {
        logger.error(`❌ Resume faylni o'qishda xato: ${file}`, error.message);
      }
    }

  } catch (error) {
    logger.error('Resume tekshirishda xato:', error);
  }
}

/**
 * Resume fayl yaratish
 */
function createResumeFile(groupId, groupName, data) {
  try {
    if (!fs.existsSync(resumeDir)) {
      fs.mkdirSync(resumeDir, { recursive: true });
    }

    const filename = `resume_${groupId}_${Date.now()}.json`;
    const filePath = path.join(resumeDir, filename);

    const resumeData = {
      groupId,
      groupName,
      startDate: data.startDate,
      endDate: data.endDate,
      processedMessages: data.processedMessages || 0,
      phonesFound: data.phonesFound || [],
      lastMessageId: data.lastMessageId || 0,
      lastMessageDate: data.lastMessageDate,
      filename: data.filename,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(filePath, JSON.stringify(resumeData, null, 2));
    logger.info(`💾 Resume fayl yaratildi: ${filename}`);

    return filePath;
  } catch (error) {
    logger.error('Resume fayl yaratishda xato:', error);
    return null;
  }
}

/**
 * Resume faylni o'chirish (skanerlash tugagach)
 */
function deleteResumeFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`🗑 Resume fayl o'chirildi: ${path.basename(filePath)}`);
    }
  } catch (error) {
    logger.error('Resume fayl o\'chirishda xato:', error);
  }
}

module.exports = {
  checkAndResumeScans,
  createResumeFile,
  deleteResumeFile
};
