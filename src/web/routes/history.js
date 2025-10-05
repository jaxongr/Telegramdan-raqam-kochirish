const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getAllGroups, getActiveGroups } = require('../../database/models');
const { scrapeGroupHistory, scrapeGroupHistoryByDate, scrapeMultipleGroups, scrapeMultipleGroupsByDate, saveResultsToFile, getProgress, stopScraping, pauseScraping, resumeScraping, addToQueue, getQueueStatus } = require('../../services/historyScraper');

// Tarix skanerlash sahifasi
router.get('/', async (req, res) => {
  try {
    const groups = await getActiveGroups(); // Faqat faol guruhlar
    res.render('history/scrape', {
      groups,
      username: req.session.username,
      result: null,
      error: null
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Bir yoki bir nechta guruhni sana bo'yicha skanerlash
router.post('/scrape-by-date', async (req, res) => {
  try {
    const { group_ids, start_date, end_date, export_name } = req.body;

    const startDate = new Date(start_date);
    const endDate = end_date ? new Date(end_date) : new Date();

    // Guruh ID larni array ga keltirish
    let groupIds = [];
    if (Array.isArray(group_ids)) {
      groupIds = group_ids.map(id => parseInt(id));
    } else if (group_ids) {
      groupIds = [parseInt(group_ids)];
    } else {
      throw new Error('Kamida bitta guruh tanlang!');
    }

    // Fayl nomi yaratish - DOIM yangi timestamp bilan
    let customFilename = null;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStamp = Date.now(); // Unique qilish uchun milliseconds

    if (export_name && export_name.trim()) {
      // Custom nom berilgan bo'lsa
      const safeName = export_name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      customFilename = `history_scrape_${safeName}_${timestamp}_${timeStamp}.json`;
    } else {
      // Nom berilmagan bo'lsa - avtomatik nom
      customFilename = `history_scrape_${timestamp}_${timeStamp}.json`;
    }

    // Task yaratish
    const task = {
      name: export_name || `Skan_${groupIds.length}_guruh`,
      filename: customFilename,
      execute: async () => {
        if (groupIds.length === 1) {
          // Bitta guruh - filename parametri yuboriladi
          return await scrapeGroupHistoryByDate(
            groupIds[0],
            startDate,
            endDate,
            null, // resumeFile
            customFilename // filename
          );
        } else {
          // Ko'p guruh
          return await scrapeMultipleGroupsByDate(
            groupIds,
            startDate,
            endDate,
            customFilename
          );
        }
      }
    };

    // Navbatga qo'shish
    const queueInfo = addToQueue(task);

    // Darhol javob qaytarish
    res.json({
      success: true,
      message: `Navbatga qo'shildi! ${groupIds.length} ta guruh. Navbatda: ${queueInfo.queuePosition}-o'rinda`,
      queueInfo
    });

  } catch (error) {
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Bitta guruhni skanerlash (eski usul)
router.post('/scrape-single', async (req, res) => {
  try {
    const { group_id, message_limit } = req.body;
    const limit = parseInt(message_limit) || 100;

    const result = await scrapeGroupHistory(parseInt(group_id), limit);

    // Faylga saqlash
    const fileInfo = await saveResultsToFile(result);

    const groups = await getActiveGroups();
    res.render('history/scrape', {
      groups,
      username: req.session.username,
      result: {
        ...result,
        fileInfo
      },
      error: null
    });
  } catch (error) {
    const groups = await getActiveGroups();
    res.render('history/scrape', {
      groups,
      username: req.session.username,
      result: null,
      error: error.message
    });
  }
});

// Progress API
router.get('/api/progress', (req, res) => {
  const progress = getProgress();
  const queueStatus = getQueueStatus();
  res.json({
    ...progress,
    queue: queueStatus
  });
});

// Export fayllarni ko'rish va yuklash
router.get('/results', async (req, res) => {
  try {
    const exportDir = path.join(__dirname, '../../../exports');

    // Fayllarni o'qish
    let exportFiles = [];
    if (fs.existsSync(exportDir)) {
      const files = fs.readdirSync(exportDir);

      // Faqat JSON fayllarni olish - metadata ni tez o'qish
      exportFiles = files
        .filter(file => file.endsWith('.json') && file.startsWith('history_scrape_'))
        .map(file => {
          const filePath = path.join(exportDir, file);
          const stats = fs.statSync(filePath);

          const sizeKB = (stats.size / 1024).toFixed(2);
          const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
          const displaySize = stats.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

          let totalPhones = 0;
          let uniquePhones = 0;

          try {
            // Faylning faqat boshini o'qish - totalPhones va uniquePhones metadata
            const fileContent = fs.readFileSync(filePath, 'utf8');

            // JSON faylning boshidan metadata qidirish (regex bilan tez)
            const totalMatch = fileContent.match(/"totalPhones"\s*:\s*(\d+)/);
            const uniqueMatch = fileContent.match(/"uniquePhones"\s*:\s*(\d+)/);

            if (totalMatch) totalPhones = parseInt(totalMatch[1]);
            if (uniqueMatch) uniquePhones = parseInt(uniqueMatch[1]);

            // Agar metadata bo'lmasa, to'liq parse qilish (faqat kichik fayllar uchun)
            if (!totalMatch && stats.size < 5 * 1024 * 1024) {
              const content = JSON.parse(fileContent);
              const phones = content.phones || [];
              totalPhones = phones.length;
              uniquePhones = [...new Set(phones.map(p => p.phone))].length;
            }
          } catch (e) {
            console.error('File read error:', file, e.message);
          }

          return {
            name: file,
            txtFile: file.replace('.json', '.txt'),
            xlsxFile: file.replace('.json', '.xlsx'),
            size: displaySize,
            sizeBytes: stats.size,
            created: stats.mtime,
            totalPhones,
            uniquePhones
          };
        })
        .sort((a, b) => b.created - a.created); // Eng yangilarni yuqorida
    }

    res.render('history/results', {
      username: req.session.username,
      exportFiles
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Export faylni yuklash
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const exportDir = path.join(__dirname, '../../../exports');
    const filePath = path.join(exportDir, filename);

    // Security check - faqat exports/ ichidagi fayllar
    if (!filePath.startsWith(exportDir)) {
      return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Fayl topilmadi');
    }

    res.download(filePath);
  } catch (error) {
    res.status(500).send('Xato: ' + error.message);
  }
});

// Bir nechta guruhni skanerlash
router.post('/scrape-multiple', async (req, res) => {
  try {
    const { group_ids, message_limit } = req.body;
    const limit = parseInt(message_limit) || 100;

    // group_ids string yoki array bo'lishi mumkin
    let groupIds = [];
    if (typeof group_ids === 'string') {
      groupIds = group_ids.split(',').map(id => parseInt(id.trim()));
    } else if (Array.isArray(group_ids)) {
      groupIds = group_ids.map(id => parseInt(id));
    }

    if (groupIds.length === 0) {
      throw new Error('Guruh tanlanmadi');
    }

    const results = await scrapeMultipleGroups(groupIds, limit);

    // Faylga saqlash
    const fileInfo = await saveResultsToFile(results);

    const groups = await getActiveGroups();
    res.render('history/scrape', {
      groups,
      username: req.session.username,
      result: {
        results,
        fileInfo,
        totalGroups: groupIds.length
      },
      error: null
    });
  } catch (error) {
    const groups = await getActiveGroups();
    res.render('history/scrape', {
      groups,
      username: req.session.username,
      result: null,
      error: error.message
    });
  }
});

// Skanerlashni to'xtatish
router.post('/stop', (req, res) => {
  const success = stopScraping();
  res.json({
    success,
    message: success ? 'To\'xtatish buyrug\'i berildi' : 'Hech qanday jarayon ishlayotgani yo\'q'
  });
});

// Skanerlashni pauza qilish
router.post('/pause', (req, res) => {
  const success = pauseScraping();
  res.json({
    success,
    message: success ? 'Pauza qilindi' : 'Pauza qilib bo\'lmadi'
  });
});

// Skanerlashni davom ettirish
router.post('/resume', (req, res) => {
  const success = resumeScraping();
  res.json({
    success,
    message: success ? 'Davom ettirildi' : 'Davom ettirib bo\'lmadi'
  });
});

// Faylni o'chirish
router.delete('/delete/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const exportDir = path.join(__dirname, '../../../exports');

    // Security check
    if (!filename.startsWith('history_scrape_')) {
      return res.json({ success: false, error: 'Noto\'g\'ri fayl nomi' });
    }

    // JSON, TXT, XLSX fayllarini o'chirish
    const jsonPath = path.join(exportDir, filename);
    const txtPath = path.join(exportDir, filename.replace('.json', '.txt'));
    const xlsxPath = path.join(exportDir, filename.replace('.json', '.xlsx'));

    let deleted = false;

    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
      deleted = true;
    }

    if (fs.existsSync(txtPath)) {
      fs.unlinkSync(txtPath);
    }

    if (fs.existsSync(xlsxPath)) {
      fs.unlinkSync(xlsxPath);
    }

    if (deleted) {
      res.json({ success: true, message: 'Fayl o\'chirildi' });
    } else {
      res.json({ success: false, error: 'Fayl topilmadi' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
