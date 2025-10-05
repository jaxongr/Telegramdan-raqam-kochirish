const express = require('express');
const router = express.Router();
const {
  getActiveAccounts,
  getAccountStats,
  getBroadcastStats,
  db
} = require('../../database/sqlite');
const {
  fetchGroupsFromAllAccounts,
  autoAssignGroupsToAccounts,
  rebalanceGroups,
  getAccountInfo
} = require('../../services/multiAccountManager');
const {
  startQRLogin,
  getLoginStatus,
  cancelLogin
} = require('../../services/accountScanner');
const {
  startPhoneLogin,
  submitPhoneCode,
  submitPassword,
  cancelPhoneLogin
} = require('../../services/phoneLogin');

/**
 * Akkauntlar ro'yxati sahifasi
 */
router.get('/', async (req, res) => {
  try {
    const accounts = getAccountStats();
    const stats = getBroadcastStats();

    res.render('accounts', {
      accounts,
      stats,
      message: req.query.message,
      error: req.query.error
    });
  } catch (error) {
    console.error('Akkauntlar sahifasida xato:', error);
    res.status(500).send('Xato: ' + error.message);
  }
});

/**
 * QR code login sahifasi
 */
router.get('/add', (req, res) => {
  res.render('account-scanner', {
    error: null
  });
});

/**
 * Telefon login sahifasi
 */
router.get('/add-phone', (req, res) => {
  res.render('account-phone-login', {
    error: null
  });
});

/**
 * QR login boshlash (API)
 */
router.post('/api/start-qr-login', async (req, res) => {
  try {
    const result = await startQRLogin();

    res.json({
      success: true,
      loginId: result.loginId,
      qrCode: result.qrCode,
      status: result.status
    });
  } catch (error) {
    console.error('QR login xatosi:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Login statusini tekshirish (API)
 */
router.get('/api/login-status/:loginId', (req, res) => {
  try {
    const status = getLoginStatus(req.params.loginId);
    res.json(status);
  } catch (error) {
    res.json({ status: 'error', error: error.message });
  }
});

/**
 * Login bekor qilish (API)
 */
router.post('/api/cancel-login/:loginId', async (req, res) => {
  try {
    await cancelLogin(req.params.loginId);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * Guruhlarni yig'ish
 */
router.post('/fetch-groups', async (req, res) => {
  try {
    await fetchGroupsFromAllAccounts();
    res.redirect('/accounts?message=Guruhlar muvaffaqiyatli yig\'ildi');
  } catch (error) {
    console.error('Guruhlarni yig\'ishda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Guruhlarni avtomatik taqsimlash
 */
router.post('/auto-assign', async (req, res) => {
  try {
    const result = await autoAssignGroupsToAccounts();
    res.redirect('/accounts?message=' + encodeURIComponent(`${result.assigned} guruh taqsimlandi`));
  } catch (error) {
    console.error('Taqsimlashda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Guruhlarni qayta taqsimlash
 */
router.post('/rebalance', async (req, res) => {
  try {
    const result = await rebalanceGroups();
    res.redirect('/accounts?message=' + encodeURIComponent(`${result.assigned} guruh qayta taqsimlandi`));
  } catch (error) {
    console.error('Qayta taqsimlashda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Akkauntni o'chirish
 */
router.post('/delete/:id', async (req, res) => {
  try {
    const accountId = req.params.id;

    // Guruhlarni boshqa akkauntlarga qayta taqsimlash kerak
    db.prepare('UPDATE broadcast_groups SET assigned_account_id = NULL WHERE assigned_account_id = ?').run(accountId);

    // Akkauntni o'chirish
    db.prepare('DELETE FROM telegram_accounts WHERE id = ?').run(accountId);

    res.redirect('/accounts?message=Akkaunt o\'chirildi');
  } catch (error) {
    console.error('Akkauntni o\'chirishda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Akkaunt ma'lumotlari (API)
 */
router.get('/api/info/:id', async (req, res) => {
  try {
    const info = await getAccountInfo(parseInt(req.params.id));
    res.json({ success: true, info });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

/**
 * Telefon login boshlash (API)
 */
router.post('/api/phone-login', async (req, res) => {
  try {
    const { phone, apiId, apiHash } = req.body;
    const result = await startPhoneLogin(phone, apiId, apiHash);
    res.json(result);
  } catch (error) {
    console.error('Telefon login xatosi:', error);
    res.json({ success: false, error: error.message });
  }
});

/**
 * SMS kodni tasdiqlash (API)
 */
router.post('/api/phone-code', async (req, res) => {
  try {
    const { loginId, code } = req.body;
    const result = await submitPhoneCode(loginId, code);
    res.json(result);
  } catch (error) {
    console.error('Kod tasdiqlash xatosi:', error);
    res.json({ success: false, error: error.message });
  }
});

/**
 * 2FA parolni tasdiqlash (API)
 */
router.post('/api/phone-password', async (req, res) => {
  try {
    const { loginId, password } = req.body;
    const result = await submitPassword(loginId, password);
    res.json(result);
  } catch (error) {
    console.error('Parol tasdiqlash xatosi:', error);
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;
