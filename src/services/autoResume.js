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

    for (const file of resumeFiles) {
      const filePath = path.join(resumeDir, file);

      try {
        const resumeData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Vaqtni tekshirish - 24 soatdan eski bo'lsa o'chirish
        const timestamp = new Date(resumeData.timestamp);
        const hoursSince = (Date.now() - timestamp.getTime()) / (1000 * 60 * 60);

        if (hoursSince > 24) {
          logger.info(`🗑 Eski resume fayl o'chirildi: ${file} (${hoursSince.toFixed(1)} soat oldin)`);
          fs.unlinkSync(filePath);
          continue;
        }

        logger.info(`▶️ Davom ettirish: ${resumeData.groupName} (${resumeData.processedMessages} xabar bajarilgan)`);

        // Navbatga qo'shish
        const task = {
          name: `Resume: ${resumeData.groupName}`,
          filename: resumeData.filename || `history_scrape_resumed_${Date.now()}.json`,
          execute: async () => {
            const startDate = new Date(resumeData.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            const endDate = new Date(resumeData.endDate || new Date());

            return await scrapeGroupHistoryByDate(
              resumeData.groupId,
              startDate,
              endDate,
              filePath, // resume fayl
              resumeData.filename
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
