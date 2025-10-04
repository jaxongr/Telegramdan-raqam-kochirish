const express = require('express');
const router = express.Router();
const {
  getAllSemySMSPhones,
  createSemySMSPhone,
  deleteSemySMSPhone,
  updateSemySMSPhone
} = require('../../database/models');
const { checkBalance, sendTestSMS, updateAllBalances } = require('../../services/smsService');

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', { phones, error: null, success: null, username: req.session.username });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Qo'shish
router.post('/add', async (req, res) => {
  try {
    const { phone } = req.body;

    // Balans tekshirish
    const balance = await checkBalance(phone);

    await createSemySMSPhone(phone, balance || 0);

    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', {
      phones,
      error: null,
      success: 'Telefon muvaffaqiyatli qo\'shildi',
      username: req.session.username
    });
  } catch (error) {
    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', { phones, error: error.message, success: null, username: req.session.username });
  }
});

// O'chirish
router.post('/delete/:phone', async (req, res) => {
  try {
    await deleteSemySMSPhone(req.params.phone);
    res.redirect('/semysms');
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Test SMS
router.post('/test', async (req, res) => {
  try {
    const { from_phone, to_phone, text } = req.body;

    const result = await sendTestSMS(from_phone, to_phone, text);

    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', {
      phones,
      error: result.success ? null : result.error,
      success: result.success ? 'Test SMS yuborildi' : null,
      username: req.session.username
    });
  } catch (error) {
    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', { phones, error: error.message, success: null, username: req.session.username });
  }
});

// Barcha balanslarni yangilash
router.post('/update-balances', async (req, res) => {
  try {
    await updateAllBalances();

    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', {
      phones,
      error: null,
      success: 'Barcha balanslar yangilandi',
      username: req.session.username
    });
  } catch (error) {
    const phones = await getAllSemySMSPhones();
    res.render('semysms/list', { phones, error: error.message, success: null, username: req.session.username });
  }
});

module.exports = router;
