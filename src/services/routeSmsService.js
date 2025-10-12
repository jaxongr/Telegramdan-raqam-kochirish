const { findMatchingPhones, logRouteSMS, getRouteById } = require('../database/routes');
const { renderSMSTemplate, getLastSMSTime } = require('./smsService');
const { getActiveSemySMSPhones } = require('../database/models');
const logger = require('../utils/logger');
const axios = require('axios');

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY;
const SEMYSMS_API_URL = 'https://semysms.net/api/3';
const SMS_COOLDOWN_HOURS = parseInt(process.env.SMS_COOLDOWN_HOURS) || 2; // 2 soat cooldown

// Round-robin index
let currentPhoneIndex = 0;

/**
 * Yo'nalish bo'yicha SMS yuborish (limitiz)
 * @param {number} routeId - Route ID
 * @returns {Promise<Object>} - Natija
 */
async function sendRouteSMS(routeId) {
  try {
    const route = await getRouteById(routeId);
    if (!route) {
      return { success: false, error: 'Yo\'nalish topilmadi', sentCount: 0, failedCount: 0 };
    }

    if (!route.active) {
      return { success: false, error: 'Yo\'nalish faol emas', sentCount: 0, failedCount: 0 };
    }

    logger.info(`\n📤 Yo'nalish SMS yuborish: ${route.name}`);
    logger.info(`   Vaqt oralig'i: ${route.time_window_minutes} daqiqa`);

    // Telefon raqamlarni topish
    const matchedPhones = await findMatchingPhones(routeId, route.time_window_minutes);

    if (matchedPhones.length === 0) {
      logger.info('   ⚠️ Mos telefon raqam topilmadi');
      return { success: true, sentCount: 0, failedCount: 0, message: 'Telefon raqam topilmadi' };
    }

    logger.info(`   ✅ ${matchedPhones.length} ta telefon topildi`);

    // SemySMS telefonlarni olish
    const semysmsPhones = await getActiveSemySMSPhones();
    if (semysmsPhones.length === 0) {
      logger.error('   ❌ SemySMS telefonlar topilmadi');
      return { success: false, error: 'SemySMS telefonlar topilmadi', sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    // Har bir telefonga SMS yuborish
    for (const phoneRecord of matchedPhones) {
      const toPhone = phoneRecord.phone;

      // 1. Cooldown tekshirish (oxirgi SMS dan 2 soat o'tganmi?)
      const lastSMS = await getLastSMSTime(toPhone);

      if (lastSMS) {
        const hoursSinceLastSMS = (Date.now() - new Date(lastSMS).getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastSMS < SMS_COOLDOWN_HOURS) {
          const remainingMinutes = Math.ceil((SMS_COOLDOWN_HOURS - hoursSinceLastSMS) * 60);
          logger.warn(`   ⏸ ${toPhone} uchun cooldown: ${remainingMinutes} daqiqa qoldi - o'tkazib yuborildi`);
          failedCount++;
          continue; // Keyingi raqamga o'tish
        }
      }

      // Template variables
      const templateVars = {
        phone: toPhone,
        group: phoneRecord.group_name || '',
        name: '',
        foundAt: new Date(phoneRecord.last_date)
      };

      // SMS matnini tayyorlash
      const smsText = renderSMSTemplate(route.sms_template, templateVars);

      // Round-robin phone tanlash
      const semysmsPhone = semysmsPhones[currentPhoneIndex % semysmsPhones.length];
      currentPhoneIndex++;

      try {
        // Telefon raqamni to'g'ri formatda yuborish
        let cleanedPhone = toPhone.replace(/\D/g, ''); // faqat raqamlar
        if (!cleanedPhone.startsWith('998')) {
          cleanedPhone = '998' + cleanedPhone; // Uzbekistan country code
        }
        cleanedPhone = '+' + cleanedPhone; // + qo'shish

        // SemySMS orqali SMS yuborish (GET request bilan)
        const response = await axios.get(SEMYSMS_API_URL + '/sms.php', {
          params: {
            token: SEMYSMS_API_KEY,
            device: semysmsPhone.device_id,
            phone: cleanedPhone,
            msg: smsText
          },
          timeout: 10000
        });

        // SemySMS response: {"code":"0","id_device":...,"id":...}
        // code="0" = success
        if (response.data && response.data.code === "0") {
          logger.info(`   ✅ SMS yuborildi: ${toPhone}`);
          await logRouteSMS(routeId, toPhone, smsText, 'success');
          sentCount++;
        } else {
          const errorMsg = response.data?.error || response.data?.message || `Error code: ${response.data?.code || 'unknown'}`;
          logger.warn(`   ❌ SMS yuborilmadi: ${toPhone} (${errorMsg})`);
          await logRouteSMS(routeId, toPhone, smsText, 'failed');
          failedCount++;
        }

        // Har bir SMS o'rtasida 1 soniya kutish
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`   ❌ SMS xatosi: ${toPhone}`, error.message);
        await logRouteSMS(routeId, toPhone, smsText, 'error');
        failedCount++;
      }
    }

    logger.info(`\n📊 Natija: ${sentCount} muvaffaqiyatli, ${failedCount} xato`);

    return {
      success: true,
      sentCount,
      failedCount,
      totalPhones: matchedPhones.length
    };

  } catch (error) {
    logger.error('❌ sendRouteSMS xatosi:', error);
    return { success: false, error: error.message, sentCount: 0, failedCount: 0 };
  }
}

module.exports = {
  sendRouteSMS
};
