const express = require('express');
const router = express.Router();
const { getStatistics, getSMSLogs } = require('../../database/models');
const { getAllSemySMSPhones } = require('../../database/models');
const { getClientStatus } = require('../../services/telegramMonitor');
const { getHistoryStats, getQueueStatus, getProgress } = require('../../services/historyScraper');

// Cache tizimi (2 daqiqa - tezlik uchun)
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 120000; // 2 daqiqa

router.get('/', async (req, res) => {
  try {
    const now = Date.now();

    // Queue status va progress - har doim yangi (cache'siz)
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

    // Yangi ma'lumot olish (parallel)
    const [stats, recentSMS, semysmsPhones] = await Promise.all([
      getStatistics(),
      getSMSLogs({ limit: 5 }),
      getAllSemySMSPhones()
    ]);

    const telegramStatus = getClientStatus();
    const totalBalance = semysmsPhones.reduce((sum, phone) => sum + (phone.balance || 0), 0);
    const historyStats = getHistoryStats();

    // Cache ga saqlash
    cachedData = {
      stats,
      recentSMS,
      totalBalance,
      semysmsPhonesCount: semysmsPhones.length,
      telegramStatus,
      historyStats
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
