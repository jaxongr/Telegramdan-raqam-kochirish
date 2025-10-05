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
  deduplicateAndAssignUniqueGroups,
  autoAssignGroupsToAccounts,
  rebalanceGroups,
  getAccountInfo
} = require('../../services/multiAccountManager');
const {
  cleanAndRefreshDatabase
} = require('../../services/telegramGroupCleaner');
const {
  balanceGroupsAcrossAccounts,
  showAccountBalance
} = require('../../services/groupBalancer');
const {
  fullyAutomaticRebalance
} = require('../../services/autoGroupJoiner');
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
    // Database'dan tez ma'lumot olish (Telegram client ishlatmasdan)
    const accounts = getAccountStats();
    const stats = getBroadcastStats();

    // Sahifani darhol yuklash
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
    error: null,
    apiId: process.env.TELEGRAM_API_ID || '',
    apiHash: process.env.TELEGRAM_API_HASH || ''
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
    const result = await fetchGroupsFromAllAccounts();
    res.redirect('/accounts?message=' + encodeURIComponent(
      `${result.total} guruh topildi, ${result.newAssigned} yangi guruh tayinlandi`
    ));
  } catch (error) {
    console.error('Guruhlarni yig\'ishda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Telegram'dan guruhlarni unikallashtiruv (REAL CLEANING)
 */
router.post('/clean-telegram-groups', async (req, res) => {
  try {
    const result = await cleanAndRefreshDatabase();
    res.redirect('/accounts?message=' + encodeURIComponent(
      `Telegram tozalandi! Unikal guruhlar: ${result.uniqueGroups}, ${result.telegramCleaned} guruhdan chiqildi`
    ));
  } catch (error) {
    console.error('Telegram tozalashda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Guruhlarni unikallashtiruv va taqsimlash (DATABASE ONLY)
 */
router.post('/deduplicate', async (req, res) => {
  try {
    const result = await deduplicateAndAssignUniqueGroups();
    res.redirect('/accounts?message=' + encodeURIComponent(
      `Unikal: ${result.uniqueGroups}, O'chirildi: ${result.duplicatesRemoved}, Tayinlandi: ${result.newlyAssigned}`
    ));
  } catch (error) {
    console.error('Unikallashtirishda xato:', error);
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
 * TO'LIQ AVTOMATIK REBALANCE
 */
router.post('/auto-rebalance', async (req, res) => {
  try {
    const result = await fullyAutomaticRebalance();

    if (result.balanced) {
      res.redirect('/accounts?message=' + encodeURIComponent(
        `Avtomatik rebalance tugadi! ${result.totalMoved || 0} guruh ko'chirildi.`
      ));
    } else {
      res.redirect('/accounts?error=' + encodeURIComponent(result.reason || 'Xato'));
    }
  } catch (error) {
    console.error('Avtomatik rebalance xatosi:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Akkauntlar orasida balanslash (SMART - yarim-avtomatik)
 */
router.post('/balance', async (req, res) => {
  try {
    const result = await balanceGroupsAcrossAccounts();

    if (result.suggestions && result.suggestions.length > 0) {
      // Tavsiyalarni session'ga saqlash
      req.session.balanceSuggestions = result.suggestions;
    }

    res.redirect('/accounts?message=' + encodeURIComponent(result.message));
  } catch (error) {
    console.error('Balanslashda xato:', error);
    res.redirect('/accounts?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Balanslash tavsiyalarini ko'rish
 */
router.get('/balance-suggestions', (req, res) => {
  const suggestions = req.session.balanceSuggestions || [];
  res.render('balance-suggestions', { suggestions });
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
