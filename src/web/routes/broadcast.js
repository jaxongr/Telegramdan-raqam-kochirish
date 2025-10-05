const express = require('express');
const router = express.Router();
const {
  getAllGroups,
  getBroadcastStats,
  db
} = require('../../database/sqlite');
const {
  broadcastMessage,
  getBroadcastStatus,
  getAllBroadcasts,
  getBroadcastLogs,
  cancelBroadcast
} = require('../../services/groupBroadcaster');
const {
  smartBroadcast,
  getBroadcastProgress
} = require('../../services/smartBroadcaster');

/**
 * Broadcast sahifasi
 */
router.get('/', async (req, res) => {
  try {
    const groups = getAllGroups();
    const stats = getBroadcastStats();
    const recentBroadcasts = getAllBroadcasts(20);

    res.render('broadcast', {
      groups,
      stats,
      recentBroadcasts,
      message: req.query.message,
      error: req.query.error
    });
  } catch (error) {
    console.error('Broadcast sahifasida xato:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

/**
 * Habar yuborish (SMART - parallel va tez)
 */
router.post('/send', async (req, res) => {
  try {
    const { message_text, messages_per_minute } = req.body;

    if (!message_text || message_text.trim().length === 0) {
      return res.redirect('/broadcast?error=' + encodeURIComponent('Habar matni bo\'sh!'));
    }

    const messagesPerMinute = parseInt(messages_per_minute) || 15;

    // SMART broadcast - parallel va tez
    const result = await smartBroadcast(message_text, messagesPerMinute);

    res.redirect('/broadcast/status/' + result.messageId);
  } catch (error) {
    console.error('Habar yuborishda xato:', error);
    res.redirect('/broadcast?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Broadcast status sahifasi
 */
router.get('/status/:messageId', (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const status = getBroadcastStatus(messageId);

    if (!status) {
      return res.redirect('/broadcast?error=' + encodeURIComponent('Broadcast topilmadi'));
    }

    const logs = getBroadcastLogs(messageId, 100);

    res.render('broadcast-status', {
      status,
      logs
    });
  } catch (error) {
    console.error('Broadcast status xatosi:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

/**
 * Broadcast progress API (real-time)
 */
router.get('/api/progress/:messageId', (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const progress = getBroadcastProgress(messageId);

    res.json(progress || { error: 'Not found' });
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * Broadcast status API
 */
router.get('/api/status/:messageId', (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const status = getBroadcastStatus(messageId);

    res.json(status || { error: 'Not found' });
  } catch (error) {
    res.json({ error: error.message });
  }
});

/**
 * Broadcast bekor qilish
 */
router.post('/cancel/:messageId', (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const cancelled = cancelBroadcast(messageId);

    if (cancelled) {
      res.redirect('/broadcast/status/' + messageId + '?message=Bekor qilindi');
    } else {
      res.redirect('/broadcast/status/' + messageId + '?error=Bekor qilib bo\'lmaydi');
    }
  } catch (error) {
    console.error('Bekor qilishda xato:', error);
    res.redirect('/broadcast?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Guruhlar ro'yxati
 */
router.get('/groups', (req, res) => {
  try {
    const groups = getAllGroups();
    const stats = getBroadcastStats();

    // Filter
    const filter = req.query.filter || 'all';
    let filteredGroups = groups;

    if (filter === 'assigned') {
      filteredGroups = groups.filter(g => g.assigned_account_id !== null);
    } else if (filter === 'unassigned') {
      filteredGroups = groups.filter(g => g.assigned_account_id === null);
    }

    res.render('broadcast-groups', {
      groups: filteredGroups,
      stats,
      filter
    });
  } catch (error) {
    console.error('Guruhlar sahifasida xato:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

module.exports = router;
