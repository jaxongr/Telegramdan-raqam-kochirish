const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const logger = require('../utils/logger');
const { addTelegramAccount } = require('../database/sqlite');

// Active QR login sessions
const activeLoginSessions = new Map();

/**
 * QR Code bilan login boshlash
 * @returns {Object} { loginId, qrCode, client }
 */
async function startQRLogin() {
  try {
    const loginId = Date.now().toString();

    // Hozirgi proyektdagi API kalitlarni ishlatamiz
    const apiId = parseInt(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;

    if (!apiId || !apiHash) {
      throw new Error('TELEGRAM_API_ID va TELEGRAM_API_HASH .env faylda kerak!');
    }

    // Yangi session yaratish (bo'sh)
    const session = new StringSession('');

    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
    });

    logger.info(`🔐 QR login boshlandi: ${loginId}`);

    // QR code handler
    let qrCode = null;
    let phoneNumber = null;

    // GramJS QR login
    await client.connect();

    const loginPromise = client.signInUserWithQrCode(
      { apiId, apiHash },
      {
        onError: async (err) => {
          logger.error('QR login xatosi:', err);
          activeLoginSessions.delete(loginId);
        },
        qrCode: async (code) => {
          // QR code olindi
          qrCode = code.token;
          logger.info(`📱 QR code yaratildi: ${loginId}`);

          // Session ni saqlash
          const sessionData = activeLoginSessions.get(loginId);
          if (sessionData) {
            sessionData.qrCode = qrCode;
            sessionData.status = 'qr_generated';
          }
        },
        password: async (hint) => {
          // Agar 2FA yoqilgan bo'lsa
          logger.info('2FA parol so\'ralyapti');
          // Web interfacedan parol so'rash kerak
          return null; // Hozircha null qaytaramiz
        },
      }
    );

    // Session data saqlash
    activeLoginSessions.set(loginId, {
      loginId,
      client,
      qrCode: null,
      status: 'waiting',
      createdAt: new Date(),
      loginPromise
    });

    // Login tugashini kutish (background)
    loginPromise.then(async (user) => {
      if (user) {
        logger.info(`✅ Login muvaffaqiyatli: ${user.phone}`);

        const sessionString = client.session.save();
        phoneNumber = user.phone;

        // Database ga saqlash
        try {
          await addTelegramAccount(
            phoneNumber,
            sessionString,
            apiId.toString(),
            apiHash
          );

          logger.info(`✓ Akkaunt saqlandi: ${phoneNumber}`);

          // Session update
          const sessionData = activeLoginSessions.get(loginId);
          if (sessionData) {
            sessionData.status = 'success';
            sessionData.phone = phoneNumber;
            sessionData.sessionString = sessionString;
          }
        } catch (dbError) {
          logger.error('Database ga saqlashda xato:', dbError);
          const sessionData = activeLoginSessions.get(loginId);
          if (sessionData) {
            sessionData.status = 'error';
            sessionData.error = dbError.message;
          }
        }

        // Client ni disconnect qilish
        await client.disconnect();
      }
    }).catch((err) => {
      logger.error('Login xatosi:', err);
      const sessionData = activeLoginSessions.get(loginId);
      if (sessionData) {
        sessionData.status = 'error';
        sessionData.error = err.message;
      }
    });

    // QR code yaratilishini kutish
    await new Promise(resolve => setTimeout(resolve, 2000));

    const sessionData = activeLoginSessions.get(loginId);

    return {
      loginId,
      qrCode: sessionData?.qrCode,
      status: sessionData?.status || 'waiting'
    };

  } catch (error) {
    logger.error('QR login boshlashda xato:', error);
    throw error;
  }
}

/**
 * Login statusini tekshirish
 */
function getLoginStatus(loginId) {
  const session = activeLoginSessions.get(loginId);

  if (!session) {
    return { status: 'not_found' };
  }

  return {
    loginId: session.loginId,
    qrCode: session.qrCode,
    status: session.status,
    phone: session.phone,
    error: session.error
  };
}

/**
 * Login session ni bekor qilish
 */
async function cancelLogin(loginId) {
  const session = activeLoginSessions.get(loginId);

  if (session && session.client) {
    try {
      await session.client.disconnect();
    } catch (err) {
      logger.error('Disconnect xatosi:', err);
    }
  }

  activeLoginSessions.delete(loginId);
  logger.info(`🚫 Login bekor qilindi: ${loginId}`);
}

/**
 * Barcha aktiv loginlarni tozalash (cleanup)
 */
function cleanupExpiredLogins() {
  const now = new Date();
  const expiryTime = 5 * 60 * 1000; // 5 daqiqa

  for (const [loginId, session] of activeLoginSessions.entries()) {
    const age = now - session.createdAt;

    if (age > expiryTime && session.status !== 'success') {
      logger.info(`🧹 Eski login session tozalandi: ${loginId}`);
      cancelLogin(loginId);
    }
  }
}

// Har 2 daqiqada eski sessionlarni tozalash
setInterval(cleanupExpiredLogins, 2 * 60 * 1000);

module.exports = {
  startQRLogin,
  getLoginStatus,
  cancelLogin,
  cleanupExpiredLogins
};
