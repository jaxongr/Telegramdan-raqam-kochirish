const express = require('express');
const router = express.Router();
const { getAllGroups } = require('../../database/models');
const { sendMessageToGroup, scheduleMessage, stopScheduledMessage, getScheduledMessages } = require('../../services/messageScheduler');

// Production yoki Demo rejimga qarab to'g'ri service'ni tanlash
const MODE = process.env.MODE || 'demo';

let telegramClient = null;

// Telegram client ni o'rnatish
function setTelegramClient(client) {
  telegramClient = client;
}

// Xabar yuborish sahifasi
router.get('/', async (req, res) => {
  try {
    const groups = await getAllGroups();
    const scheduledMessages = getScheduledMessages();

    res.render('messages/send', {
      groups,
      scheduledMessages,
      username: req.session.username,
      success: null,
      error: null
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Bir martalik xabar yuborish
router.post('/send-once', async (req, res) => {
  try {
    const { group_id, message } = req.body;

    if (!group_id || !message) {
      throw new Error('Guruh va xabar matnini kiriting!');
    }

    if (MODE !== 'server') {
      throw new Error('Xabar yuborish faqat server rejimida ishlaydi!');
    }

    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    // Guruhni topish
    const groups = await getAllGroups();
    const group = groups.find(g => g.id == group_id);

    if (!group) {
      throw new Error('Guruh topilmadi!');
    }

    // Xabar yuborish
    const result = await sendMessageToGroup(telegramClient, group.telegram_id, message);

    const scheduledMessages = getScheduledMessages();

    if (result.success) {
      res.render('messages/send', {
        groups,
        scheduledMessages,
        username: req.session.username,
        success: `✅ Xabar "${group.name}" guruhiga yuborildi!`,
        error: null
      });
    } else {
      res.render('messages/send', {
        groups,
        scheduledMessages,
        username: req.session.username,
        success: null,
        error: result.error
      });
    }
  } catch (error) {
    const groups = await getAllGroups();
    const scheduledMessages = getScheduledMessages();
    res.render('messages/send', {
      groups,
      scheduledMessages,
      username: req.session.username,
      success: null,
      error: error.message
    });
  }
});

// Jadvalga qo'shish (avtomatik takrorlanuvchi xabar)
router.post('/schedule', async (req, res) => {
  try {
    const { group_id, message, interval_minutes } = req.body;

    if (!group_id || !message || !interval_minutes) {
      throw new Error('Barcha maydonlarni to\'ldiring!');
    }

    if (MODE !== 'server') {
      throw new Error('Xabar yuborish faqat server rejimida ishlaydi!');
    }

    if (!telegramClient || !telegramClient.connected) {
      throw new Error('Telegram client ulanmagan!');
    }

    const groups = await getAllGroups();
    const group = groups.find(g => g.id == group_id);

    if (!group) {
      throw new Error('Guruh topilmadi!');
    }

    // Jadvalga qo'shish
    const result = scheduleMessage(
      telegramClient,
      group.telegram_id,
      message,
      parseInt(interval_minutes)
    );

    const scheduledMessages = getScheduledMessages();

    if (result.success) {
      res.render('messages/send', {
        groups,
        scheduledMessages,
        username: req.session.username,
        success: `✅ "${group.name}" guruhiga har ${interval_minutes} daqiqada xabar yuborish jadvalga qo'shildi!`,
        error: null
      });
    } else {
      res.render('messages/send', {
        groups,
        scheduledMessages,
        username: req.session.username,
        success: null,
        error: result.error
      });
    }
  } catch (error) {
    const groups = await getAllGroups();
    const scheduledMessages = getScheduledMessages();
    res.render('messages/send', {
      groups,
      scheduledMessages,
      username: req.session.username,
      success: null,
      error: error.message
    });
  }
});

// Jadvalni to'xtatish
router.post('/stop-schedule/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const result = stopScheduledMessage(groupId);

    res.json(result);
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.setTelegramClient = setTelegramClient;
