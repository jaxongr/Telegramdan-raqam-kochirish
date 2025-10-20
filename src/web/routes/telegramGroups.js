const express = require('express');
const router = express.Router();
const { getAllGroups } = require('../../database/models');

// Server yoki Demo rejimga qarab to'g'ri service'ni tanlash
const MODE = process.env.MODE || 'demo';
const isServerMode = (MODE === 'server' || MODE === 'production');
const telegramService = isServerMode
  ? require('../../services/telegramClient')
  : require('../../services/telegramMonitor');

const { getDialogs } = telegramService;

/**
 * Telegram session'dagi barcha guruhlar ro'yxati
 * Database bilan taqqoslash va monitoring holatini ko'rsatish
 */
router.get('/', async (req, res) => {
  try {
    // Telegram'dan barcha guruhlarni olish
    const telegramDialogs = await getDialogs();

    // Database'dagi guruhlarni olish
    const dbGroups = await getAllGroups();

    // Database'dagi guruhlarni Telegram ID bo'yicha indexlash
    const dbGroupsMap = {};
    dbGroups.forEach(group => {
      dbGroupsMap[group.telegram_id] = group;
    });

    // Telegram guruhlarini database bilan solishtirish
    const groupsWithStatus = telegramDialogs.map(dialog => {
      const dbGroup = dbGroupsMap[dialog.id];

      return {
        telegram_id: dialog.id,
        name: dialog.name,
        isGroup: dialog.isGroup,
        isChannel: dialog.isChannel,
        // Database'da bor yoki yo'q
        inDatabase: !!dbGroup,
        // Monitoring ostida yoki yo'q
        active: dbGroup ? dbGroup.active : false,
        // SMS enabled yoki yo'q
        sms_enabled: dbGroup ? dbGroup.sms_enabled : false,
        // Database ID (agar bor bo'lsa)
        db_id: dbGroup ? dbGroup.id : null,
        // Keywords
        keywords: dbGroup ? dbGroup.keywords : null
      };
    });

    // Statistika
    const stats = {
      total: groupsWithStatus.length,
      inDatabase: groupsWithStatus.filter(g => g.inDatabase).length,
      monitoring: groupsWithStatus.filter(g => g.active).length,
      smsEnabled: groupsWithStatus.filter(g => g.sms_enabled).length,
      notInDatabase: groupsWithStatus.filter(g => !g.inDatabase).length
    };

    res.render('telegram-groups/list', {
      groups: groupsWithStatus,
      stats,
      username: req.session.username
    });
  } catch (error) {
    console.error('Telegram guruhlar sahifasi xatosi:', error);
    res.status(500).render('error', {
      error: 'Telegram guruhlarni olishda xato: ' + error.message,
      username: req.session.username
    });
  }
});

module.exports = router;
