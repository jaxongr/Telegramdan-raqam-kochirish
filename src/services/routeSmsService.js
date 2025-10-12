const { findMatchingPhones, logRouteSMS, getRouteById } = require('../database/routes');
const { renderSMSTemplate } = require('./smsService');
const { getActiveSemySMSPhones } = require('../database/models');
const logger = require('../utils/logger');
const axios = require('axios');

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY;
const SEMYSMS_API_URL = 'https://api.semysms.net/';

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
        // SemySMS orqali SMS yuborish
        const response = await axios.post(SEMYSMS_API_URL + 'sms/send', {
          api_key: SEMYSMS_API_KEY,
          device: semysmsPhone.device_id,
          phone: toPhone,
          message: smsText
        }, {
          timeout: 10000
        });

        if (response.data && response.data.success) {
          logger.info(`   ✅ SMS yuborildi: ${toPhone}`);
          await logRouteSMS(routeId, toPhone, smsText, 'success');
          sentCount++;
        } else {
          logger.warn(`   ❌ SMS yuborilmadi: ${toPhone} (${response.data?.error || 'Unknown error'})`);
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
