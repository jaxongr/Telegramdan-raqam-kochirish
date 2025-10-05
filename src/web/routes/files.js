const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const exportsDir = path.join(__dirname, '../../exports');

/**
 * Fayl hajmini formatlab chiqarish
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Fayllar ro'yxati sahifasi
 */
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const fileNames = fs.readdirSync(exportsDir);

    const files = fileNames
      .map(name => {
        const filePath = path.join(exportsDir, name);
        const stats = fs.statSync(filePath);

        return {
          name,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          modified: stats.mtime,
          ext: path.extname(name).toLowerCase()
        };
      })
      .sort((a, b) => b.modified - a.modified); // Eng yangilari birinchi

    res.render('files', { files });
  } catch (error) {
    console.error('Fayllar sahifasida xato:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

/**
 * Faylni yuklab olish
 */
router.get('/download/:filename', (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = path.join(exportsDir, filename);

    // Security check - faqat exports papkasidagi fayllar
    const resolvedPath = path.resolve(filePath);
    const resolvedExportsDir = path.resolve(exportsDir);

    if (!resolvedPath.startsWith(resolvedExportsDir)) {
      return res.status(403).send('Taqiqlangan!');
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Fayl topilmadi');
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Yuklab olishda xato:', err);
        if (!res.headersSent) {
          res.status(500).send('Xato: ' + err.message);
        }
      }
    });
  } catch (error) {
    console.error('Fayl yuklab olishda xato:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

module.exports = router;
