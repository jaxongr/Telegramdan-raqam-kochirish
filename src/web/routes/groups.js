const express = require('express');
const router = express.Router();
const { getAllGroups, createGroup, updateGroup, deleteGroup, getGroupById } = require('../../database/models');

// Production yoki Demo rejimga qarab to'g'ri service'ni tanlash
const MODE = process.env.MODE || 'demo';
const telegramService = MODE === 'production'
  ? require('../../services/telegramClient')
  : require('../../services/telegramMonitor');

const { getDialogs } = telegramService;

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const groups = await getAllGroups();
    res.render('groups/list', { groups, username: req.session.username });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Qo'shish sahifasi
router.get('/add', async (req, res) => {
  try {
    const dialogs = await getDialogs();
    res.render('groups/add', { dialogs, error: null, username: req.session.username });
  } catch (error) {
    res.render('groups/add', { dialogs: [], error: error.message, username: req.session.username });
  }
});

// Qo'shish
router.post('/add', async (req, res) => {
  try {
    const { name, telegram_id, keywords, sms_template } = req.body;

    // Max 50 ta limit
    const allGroups = await getAllGroups();
    if (allGroups.length >= 50) {
      const dialogs = await getDialogs();
      return res.render('groups/add', {
        dialogs,
        error: 'Maksimum 50 ta guruh qo\'shish mumkin',
        username: req.session.username
      });
    }

    await createGroup(name, telegram_id, keywords, sms_template);
    res.redirect('/groups');
  } catch (error) {
    const dialogs = await getDialogs();
    res.render('groups/add', { dialogs, error: error.message, username: req.session.username });
  }
});

// Tahrirlash sahifasi
router.get('/edit/:id', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) {
      return res.redirect('/groups');
    }
    res.render('groups/edit', { group, error: null, username: req.session.username });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Tahrirlash
router.post('/edit/:id', async (req, res) => {
  try {
    const { name, keywords, sms_template, active, sms_enabled } = req.body;
    await updateGroup(req.params.id, {
      name,
      keywords,
      sms_template,
      active: active === 'on',
      sms_enabled: sms_enabled === 'on'
    });
    res.redirect('/groups');
  } catch (error) {
    const group = await getGroupById(req.params.id);
    res.render('groups/edit', { group, error: error.message, username: req.session.username });
  }
});

// O'chirish
router.post('/delete/:id', async (req, res) => {
  try {
    await deleteGroup(req.params.id);
    res.redirect('/groups');
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

module.exports = router;
