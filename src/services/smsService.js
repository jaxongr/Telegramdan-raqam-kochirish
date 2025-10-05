const axios = require('axios');
const { getActiveSemySMSPhones, updateSemySMSPhone, logSMS, getSMSCountToday } = require('../database/models');
const logger = require('../utils/logger');

const SEMYSMS_API_URL = 'https://semysms.net/api/3';
const DAILY_LIMIT = parseInt(process.env.SMS_DAILY_LIMIT_PER_NUMBER) || 2;
const SMS_DELAY = parseInt(process.env.SMS_DELAY_SECONDS) || 1;

let currentPhoneIndex = 0; // Round-robin uchun

/**
 * SMS yuborish (round-robin bilan)
 */
async function sendSMS(toPhone, groupId, messageText) {
  try {
    // Input validation
    if (!toPhone || !messageText) {
      logger.error('SMS yuborish: telefon yoki xabar bo\'sh');
      return { success: false, error: 'invalid_input' };
    }

    // Kunlik limit tekshirish
    const todayCount = await getSMSCountToday(toPhone);
    if (todayCount >= DAILY_LIMIT) {
      logger.warn(`${toPhone} bugun limitga yetgan (${todayCount}/${DAILY_LIMIT})`);
      return { success: false, error: 'daily_limit_reached' };
    }

    // Faol SemySMS telefonlarni olish
    const semysmsPhones = await getActiveSemySMSPhones();
    if (semysmsPhones.length === 0) {
      logger.error('SemySMS telefon raqamlar yo\'q!');
      await logSMS(toPhone, groupId, messageText, null, 'failed', 'No active SemySMS phones');
      return { success: false, error: 'no_semysms_phones' };
    }

    // Round-robin: navbatdagi telefonni tanlash
    const senderPhone = selectNextPhone(semysmsPhones);
    if (!senderPhone) {
      logger.error('Barcha SemySMS telefonlar ishlamayapti');
      await logSMS(toPhone, groupId, messageText, null, 'failed', 'All phones unavailable');
      return { success: false, error: 'all_phones_unavailable' };
    }

    // Balansni tekshirish
    const balance = await checkBalance(senderPhone.phone);
    if (balance !== null && balance < 1) {
      logger.warn(`${senderPhone.phone} balans yetarli emas (${balance})`);
      await updateSemySMSPhone(senderPhone.phone, { status: 'low_balance' });
      return await sendSMS(toPhone, groupId, messageText); // Keyingisi bilan urinish
    }

    // SMS matnini tayyorlash
    const smsText = prepareSMSText(messageText);

    // SMS yuborish
    const result = await sendViaSemySMS(senderPhone.phone, toPhone, smsText);

    if (result.success) {
      logger.info(`✓ SMS yuborildi: ${senderPhone.phone} → ${toPhone}`);

      // Statistika yangilash
      await updateSemySMSPhone(senderPhone.phone, {
        last_used: true,
        total_sent: true,
        balance: result.balance || balance
      });

      // Log qilish
      await logSMS(toPhone, groupId, smsText, senderPhone.phone, 'success', null);

      // Delay
      await sleep(SMS_DELAY * 1000);

      return { success: true, senderPhone: senderPhone.phone };
    } else {
      logger.error(`✗ SMS yuborishda xato: ${result.error}`);
      await logSMS(toPhone, groupId, smsText, senderPhone.phone, 'failed', result.error);

      // Agar telefon ishlamasa, keyingisi bilan urinish
      if (result.error.includes('invalid') || result.error.includes('blocked')) {
        await updateSemySMSPhone(senderPhone.phone, { status: 'inactive' });
        return await sendSMS(toPhone, groupId, messageText);
      }

      return { success: false, error: result.error };
    }

  } catch (error) {
    logger.error('SMS yuborishda xato:', error);
    await logSMS(toPhone, groupId, messageText, null, 'failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Round-robin: navbatdagi telefonni tanlash
 */
function selectNextPhone(phones) {
  if (phones.length === 0) return null;

  // Faqat faol va balansi yetarli bo'lganlarni filtr qilish
  const availablePhones = phones.filter(p => p.status === 'active' && (p.balance === null || p.balance >= 1));

  if (availablePhones.length === 0) return null;

  // Round-robin
  if (currentPhoneIndex >= availablePhones.length) {
    currentPhoneIndex = 0;
  }

  const selected = availablePhones[currentPhoneIndex];
  currentPhoneIndex++;

  return selected;
}

/**
 * SemySMS API orqali SMS yuborish
 */
async function sendViaSemySMS(fromPhone, toPhone, text) {
  try {
    const apiKey = process.env.SEMYSMS_API_KEY;

    if (!apiKey) {
      throw new Error('SEMYSMS_API_KEY .env faylda yo\'q');
    }

    // Telefon raqamni international formatga keltirish
    let cleanedTo = toPhone.replace(/\D/g, ''); // faqat raqamlar
    if (!cleanedTo.startsWith('998')) {
      cleanedTo = '998' + cleanedTo; // Uzbekistan country code
    }
    cleanedTo = '+' + cleanedTo; // + qo'shish

    const params = {
      token: apiKey, // SemySMS 'token' parametrini ishlatadi
      device: 'active', // Aktiv device ishlatish
      phone: cleanedTo,
      msg: text
    };

    const response = await axios.get(`${SEMYSMS_API_URL}/sms.php`, {
      params,
      timeout: 10000
    });

    if (response.data && response.data.success) {
      return {
        success: true,
        balance: response.data.balance || null
      };
    } else {
      return {
        success: false,
        error: response.data?.error || response.data?.message || 'Unknown error'
      };
    }

  } catch (error) {
    logger.error('SemySMS API xatosi:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Balansni tekshirish
 */
async function checkBalance(phone) {
  try {
    const apiKey = process.env.SEMYSMS_API_KEY;
    if (!apiKey) return null;

    const cleanedPhone = phone.replace(/\D/g, '');

    const response = await axios.get(`${SEMYSMS_API_URL}/balance.php`, {
      params: {
        token: apiKey
      },
      timeout: 5000
    });

    if (response.data && response.data.balance !== undefined) {
      return parseFloat(response.data.balance);
    }

    return null;
  } catch (error) {
    logger.error('Balans tekshirishda xato:', error.message, error.response?.data);
    return null;
  }
}

/**
 * SMS matnini tayyorlash
 */
function prepareSMSText(messageText) {
  // SMS 160 belgidan oshmasligi kerak
  let text = messageText.trim();

  // Ortiqcha bo'shliqlarni olib tashlash
  text = text.replace(/\s+/g, ' ');

  // Agar juda uzun bo'lsa, qisqartirish
  if (text.length > 160) {
    text = text.substring(0, 157) + '...';
  }

  return text;
}

/**
 * Test SMS yuborish
 */
async function sendTestSMS(fromPhone, toPhone, text = 'Test SMS') {
  return await sendViaSemySMS(fromPhone, toPhone, text);
}

/**
 * Barcha SemySMS telefonlar balansini yangilash
 */
async function updateAllBalances() {
  try {
    const phones = await getActiveSemySMSPhones();
    const results = [];

    for (const phone of phones) {
      const balance = await checkBalance(phone.phone);
      if (balance !== null) {
        await updateSemySMSPhone(phone.phone, { balance });
        results.push({ phone: phone.phone, balance });
      }
    }

    logger.info('Barcha balanslar yangilandi');
    return results;
  } catch (error) {
    logger.error('Balanslarni yangilashda xato:', error);
    throw error;
  }
}

/**
 * Sleep funksiyasi
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  sendSMS,
  sendTestSMS,
  checkBalance,
  updateAllBalances,
  prepareSMSText
};
