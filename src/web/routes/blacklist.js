const express = require('express');
const router = express.Router();
const {
  addToBlacklist,
  removeFromBlacklist,
  getAllBlacklist,
  getBlacklistStats,
  searchBlacklist
} = require('../../database/blacklist');

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    let blacklist;
    if (search) {
      blacklist = await searchBlacklist(search);
    } else {
      blacklist = await getAllBlacklist();
    }

    const stats = await getBlacklistStats();

    res.render('blacklist/list', {
      blacklist,
      stats,
      search: search || '',
      username: req.session.username
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Qo'shish sahifasi
router.get('/add', (req, res) => {
  res.render('blacklist/add', {
    error: null,
    username: req.session.username
  });
});

// Qo'shish
router.post('/add', async (req, res) => {
  try {
    const { phone, reason, notes } = req.body;

    const result = await addToBlacklist(phone, reason, notes);

    if (result.success) {
      res.redirect('/blacklist');
    } else {
      res.render('blacklist/add', {
        error: result.error === 'already_in_blacklist'
          ? 'Bu raqam allaqachon qora ro\'yxatda'
          : 'Xato yuz berdi',
        username: req.session.username
      });
    }
  } catch (error) {
    res.render('blacklist/add', {
      error: error.message,
      username: req.session.username
    });
  }
});

// O'chirish
router.post('/delete/:id', async (req, res) => {
  try {
    await removeFromBlacklist(req.params.id);
    res.redirect('/blacklist');
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// API: Tekshirish (AJAX uchun)
router.get('/api/check/:phone', async (req, res) => {
  try {
    const { isBlacklisted } = require('../../database/blacklist');
    const blacklisted = await isBlacklisted(req.params.phone);

    res.json({ blacklisted });
  } catch (error) {
    res.json({ error: error.message });
  }
});

module.exports = router;
