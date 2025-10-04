const express = require('express');
const router = express.Router();
const { getStatistics, getSMSLogs } = require('../../database/models');
const { getAllSemySMSPhones } = require('../../database/models');
const { getClientStatus } = require('../../services/telegramMonitor');
const { getHistoryStats } = require('../../services/historyScraper');

router.get('/', async (req, res) => {
  try {
    const stats = await getStatistics();
    const recentSMS = await getSMSLogs({ limit: 10 });
    const semysmsPhones = await getAllSemySMSPhones();
    const telegramStatus = getClientStatus();

    // Umumiy balans
    const totalBalance = semysmsPhones.reduce((sum, phone) => sum + (phone.balance || 0), 0);

    // Eski xabarlar statistikasi
    const historyStats = getHistoryStats();

    res.render('dashboard', {
      stats,
      recentSMS,
      totalBalance,
      semysmsPhonesCount: semysmsPhones.length,
      telegramStatus,
      historyStats,
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
