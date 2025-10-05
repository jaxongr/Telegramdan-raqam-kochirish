const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const input = require('input');
const logger = require('../utils/logger');
const { addTelegramAccount } = require('../database/sqlite');

// Active login sessions
const activePhoneLogins = new Map();

/**
 * Telefon raqam bilan login boshlash
 */
async function startPhoneLogin(phone, apiId, apiHash) {
  const loginId = `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`📱 Telefon login boshlandi: ${phone}`);

    const stringSession = new StringSession('');
    const client = new TelegramClient(stringSession, parseInt(apiId), apiHash, {
      connectionRetries: 5,
    });

    // Session data
    const sessionData = {
      loginId,
      phone,
      apiId,
      apiHash,
      client,
      stringSession,
      status: 'waiting_code',
      phoneCodeHash: null,
      createdAt: new Date(),
    };

    activePhoneLogins.set(loginId, sessionData);

    // Connect and send code
    await client.connect();

    const result = await client.sendCode(
      {
        apiId: parseInt(apiId),
        apiHash: apiHash,
      },
      phone
    );

    sessionData.phoneCodeHash = result.phoneCodeHash;
    sessionData.status = 'code_sent';

    logger.info(`✓ SMS kod yuborildi: ${phone}`);

    return {
      success: true,
      loginId,
      message: 'SMS kod yuborildi',
    };

  } catch (error) {
    logger.error('Telefon login xatosi:', error);
    activePhoneLogins.delete(loginId);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * SMS kodni tasdiqlash
 */
async function submitPhoneCode(loginId, code) {
  const sessionData = activePhoneLogins.get(loginId);

  if (!sessionData) {
    return {
      success: false,
      error: 'Login session topilmadi',
    };
  }

  try {
    const { client, phone, phoneCodeHash, apiId, apiHash } = sessionData;

    logger.info(`📝 Kod tasdiqlanmoqda: ${loginId}`);

    const result = await client.invoke(
      new (require('telegram/tl').Api.auth.SignIn)({
        phoneNumber: phone,
        phoneCodeHash: phoneCodeHash,
        phoneCode: code,
      })
    );

    // Muvaffaqiyatli kirish
    const sessionString = client.session.save();

    // Database'ga saqlash
    addTelegramAccount(phone, sessionString, apiId, apiHash);

    logger.info(`✓ Akkaunt qo'shildi: ${phone}`);

    // Cleanup
    await client.disconnect();
    activePhoneLogins.delete(loginId);

    return {
      success: true,
      message: 'Akkaunt muvaffaqiyatli qo\'shildi',
    };

  } catch (error) {
    // 2FA kerak bo'lsa
    if (error.errorMessage === 'SESSION_PASSWORD_NEEDED') {
      sessionData.status = 'waiting_password';

      return {
        success: true,
        needPassword: true,
        message: '2FA parol kerak',
      };
    }

    logger.error('Kod tasdiqlash xatosi:', error);

    return {
      success: false,
      error: error.message || 'Kod noto\'g\'ri',
    };
  }
}

/**
 * 2FA parolni tasdiqlash
 */
async function submitPassword(loginId, password) {
  const sessionData = activePhoneLogins.get(loginId);

  if (!sessionData) {
    return {
      success: false,
      error: 'Login session topilmadi',
    };
  }

  try {
    const { client, phone, apiId, apiHash } = sessionData;

    logger.info(`🔐 2FA parol tasdiqlanmoqda: ${loginId}`);

    await client.invoke(
      new (require('telegram/tl').Api.auth.CheckPassword)({
        password: await client.computeCheck(password),
      })
    );

    // Muvaffaqiyatli kirish
    const sessionString = client.session.save();

    // Database'ga saqlash
    addTelegramAccount(phone, sessionString, apiId, apiHash);

    logger.info(`✓ Akkaunt qo'shildi (2FA): ${phone}`);

    // Cleanup
    await client.disconnect();
    activePhoneLogins.delete(loginId);

    return {
      success: true,
      message: 'Akkaunt muvaffaqiyatli qo\'shildi',
    };

  } catch (error) {
    logger.error('2FA parol xatosi:', error);

    return {
      success: false,
      error: error.message || 'Parol noto\'g\'ri',
    };
  }
}

/**
 * Login bekor qilish
 */
async function cancelPhoneLogin(loginId) {
  const sessionData = activePhoneLogins.get(loginId);

  if (sessionData) {
    try {
      await sessionData.client.disconnect();
    } catch (err) {
      // Ignore
    }
    activePhoneLogins.delete(loginId);
  }
}

module.exports = {
  startPhoneLogin,
  submitPhoneCode,
  submitPassword,
  cancelPhoneLogin,
};
