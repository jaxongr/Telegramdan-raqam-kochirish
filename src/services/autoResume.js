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
    // .env'dan AUTO_RESUME_ENABLED tekshirish
    const autoResumeEnabled = process.env.AUTO_RESUME_ENABLED !== 'false';

    if (!autoResumeEnabled) {
      console.log('⚠️  AUTO_RESUME o\'chirilgan (.env: AUTO_RESUME_ENABLED=false)');
      console.log('   Resume fayllar mavjud bo\'lsa, web interface\'dan qo\'lda davom ettiring.');
      return;
    }

    if (!fs.existsSync(resumeDir)) {
      return;
    }

    const files = fs.readdirSync(resumeDir);
    const resumeFiles = files.filter(f => f.startsWith('resume_') && f.endsWith('.json'));

    if (resumeFiles.length === 0) {
      console.log('📂 Resume fayllar topilmadi');
      return;
    }

    console.log(`\n📂 ${resumeFiles.length} ta resume fayl topildi`);

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

    console.log(`🔄 ${sortedFiles.length} ta resume fayl topildi`);

    // BARCHA resume fayllarni qayta ishlash
    for (let i = 0; i < sortedFiles.length; i++) {
      const { file, filePath, data: resumeData, timestamp } = sortedFiles[i];

      try {
        // Vaqtni tekshirish - 24 soatdan eski bo'lsa o'chirish
        const hoursSince = (Date.now() - timestamp) / (1000 * 60 * 60);

        if (hoursSince > 24) {
          console.log(`🗑 Eski resume fayl o'chirildi: ${file} (${hoursSince.toFixed(1)} soat oldin)`);
          fs.unlinkSync(filePath);
          continue;
        }

        // Eski filename ni olish yoki yangi yaratish
        const originalFilename = resumeData.filename || `history_scrape_resumed_${resumeData.groupName}_${Date.now()}.json`;

        const phonesCount = resumeData.phonesFoundCount || (resumeData.phonesFound ? resumeData.phonesFound.length : 0);
        console.log(`\n▶️ Davom ettirish: ${resumeData.groupName}`);
        console.log(`   📊 ${resumeData.processedMessages} xabar | ${phonesCount} raqam topildi`);
        console.log(`   📝 Fayl: ${originalFilename}`);

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

/**
 * Barcha resume fayllarni ro'yxatini olish
 */
function getResumeFiles() {
  try {
    if (!fs.existsSync(resumeDir)) {
      return [];
    }

    const files = fs.readdirSync(resumeDir);
    const resumeFiles = files.filter(f => f.startsWith('resume_') && f.endsWith('.json'));

    return resumeFiles.map(file => {
      const filePath = path.join(resumeDir, file);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const stats = fs.statSync(filePath);

        return {
          filename: file,
          filePath,
          groupId: data.groupId,
          groupName: data.groupName,
          processedMessages: data.processedMessages || 0,
          phonesCount: data.phonesFoundCount || (data.phonesFound ? data.phonesFound.length : 0),
          timestamp: data.timestamp,
          fileSize: stats.size,
          age: Date.now() - new Date(data.timestamp).getTime()
        };
      } catch (error) {
        logger.error(`Resume fayl o'qishda xato: ${file}`, error);
        return null;
      }
    }).filter(f => f !== null);
  } catch (error) {
    logger.error('Resume fayllar ro\'yxatini olishda xato:', error);
    return [];
  }
}

/**
 * Barcha resume fayllarni o'chirish
 */
function clearAllResumeFiles() {
  try {
    if (!fs.existsSync(resumeDir)) {
      return { success: true, deleted: 0 };
    }

    const files = fs.readdirSync(resumeDir);
    const resumeFiles = files.filter(f => f.startsWith('resume_') && f.endsWith('.json'));

    let deleted = 0;
    resumeFiles.forEach(file => {
      const filePath = path.join(resumeDir, file);
      fs.unlinkSync(filePath);
      deleted++;
    });

    logger.info(`🗑 ${deleted} ta resume fayl o'chirildi`);
    return { success: true, deleted };
  } catch (error) {
    logger.error('Resume fayllarni o\'chirishda xato:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  checkAndResumeScans,
  createResumeFile,
  deleteResumeFile,
  getResumeFiles,
  clearAllResumeFiles
};
