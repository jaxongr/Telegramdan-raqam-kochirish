const express = require('express');
const router = express.Router();
const { getStatistics, getSMSLogs, getGroupStatistics } = require('../../database/models');
const { getAllSemySMSPhones } = require('../../database/models');
const { getClientStatus } = require('../../services/telegramMonitor');
const { getHistoryStats, getQueueStatus, getProgress } = require('../../services/historyScraper');

// Cache tizimi (2 minut - dashboard tez yuklash uchun)
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 120000; // 2 minut

router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    // Queue status - har doim yangi (cache'siz)
    const queueStatus = getQueueStatus();
    const currentProgress = getProgress();

    // Cache tekshirish
    if (cachedData && (now - cacheTime) < CACHE_DURATION) {
      return res.render('dashboard', {
        ...cachedData,
        queueStatus,
        currentProgress,
        username: req.session.username
      });
    }

    // Yangi ma'lumot olish
    const stats = await getStatistics();
    const recentSMS = await getSMSLogs({ limit: 5 }); // Faqat 5 ta (tezlik uchun)
    const semysmsPhones = await getAllSemySMSPhones();
    const telegramStatus = getClientStatus();

    // Umumiy balans
    const totalBalance = semysmsPhones.reduce((sum, phone) => sum + (phone.balance || 0), 0);

    // Eski xabarlar statistikasi
    const historyStats = getHistoryStats();

    // Guruh bo'yicha statistika
    const groupStats = await getGroupStatistics();

    // Cache ga saqlash
    cachedData = {
      stats,
      recentSMS,
      totalBalance,
      semysmsPhonesCount: semysmsPhones.length,
      telegramStatus,
      historyStats,
      groupStats
    };
    cacheTime = now;

    res.render('dashboard', {
      ...cachedData,
      queueStatus,
      currentProgress,
      username: req.session.username
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send(`
      <h1>Xato</h1>
      <p>${error.message}</p>
      <pre>${error.stack}</pre>
      <a href="/">Qaytish</a>
    `);
  }
});

module.exports = router;
