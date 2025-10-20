const { findMatchingPhones, logRouteSMS, getRouteById } = require('../database/routes');
const { renderSMSTemplate } = require('./smsService');
const { getActiveSemySMSPhones } = require('../database/models');
const { query } = require('../database/sqlite');
const logger = require('../utils/logger');
const axios = require('axios');

const SEMYSMS_API_KEY = process.env.SEMYSMS_API_KEY;
const SEMYSMS_API_URL = 'https://semysms.net/api/3';

// Round-robin index
let currentPhoneIndex = 0;

// 2 SOATLIK COOLDOWN (millisekundda)
const SMS_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 soat

/**
 * Telefon raqamga oxirgi SMS yuborilgan vaqtni tekshirish
 * @param {number} routeId - Route ID
 * @param {string} toPhone - Telefon raqam
 * @returns {Promise<boolean>} - true agar yuborish mumkin bo'lsa
 */
async function canSendSMS(routeId, toPhone) {
  try {
    const logs = await query(
      `SELECT sent_at FROM route_sms_logs
       WHERE route_id = ? AND to_phone = ? AND status = 'success'
       ORDER BY sent_at DESC LIMIT 1`,
      [routeId, toPhone]
    );

    if (logs.length === 0) {
      return true; // Hech qachon yuborilmagan
    }

    const lastSentAt = new Date(logs[0].sent_at + 'Z'); // UTC marker
    const now = new Date();
    const timeDiff = now - lastSentAt;

    const canSend = timeDiff >= SMS_COOLDOWN_MS;

    if (!canSend) {
      const remainingMs = SMS_COOLDOWN_MS - timeDiff;
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMinutes = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      const timeStr = remainingHours > 0
        ? `${remainingHours} soat ${remainingMinutes} daqiqa`
        : `${remainingMinutes} daqiqa`;

      console.log(`   ⏭️ Skip (2 soatlik cooldown): ${toPhone} - ${timeStr} qoldi`);
    }

    return canSend;
  } catch (error) {
    logger.error('canSendSMS xatosi:', error);
    return true; // Xato bo'lsa, yuborishga ruxsat berish
  }
}

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

    console.log(`\n📤 Yo'nalish SMS yuborish: ${route.name}`);
    console.log(`   Vaqt oralig'i: ${route.time_window_minutes} daqiqa`);

    // Telefon raqamlarni topish
    const matchedPhones = await findMatchingPhones(routeId, route.time_window_minutes);

    if (matchedPhones.length === 0) {
      console.log('   ⚠️ Mos telefon raqam topilmadi');
      return { success: true, sentCount: 0, failedCount: 0, message: 'Telefon raqam topilmadi' };
    }

    console.log(`   ✅ ${matchedPhones.length} ta telefon topildi`);

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

      // 2 SOATLIK COOLDOWN TEKSHIRUVI
      const canSend = await canSendSMS(routeId, toPhone);
      if (!canSend) {
        continue; // Keyingisiga o'tish (log canSendSMS ichida)
      }

      console.log(`   📞 SMS yuborish: ${toPhone}`);

      // Template variables
      const templateVars = {
        phone: toPhone,
        group: phoneRecord.group_name || '',
        name: '',
        foundAt: new Date(phoneRecord.last_date)
      };

      // SMS matnini tayyorlash
      console.log(`   📝 Template render: shablon="${route.sms_template?.substring(0, 50)}..."`);
      console.log(`   📝 Template vars: phone=${templateVars.phone}, group=${templateVars.group}`);

      const smsText = renderSMSTemplate(route.sms_template, templateVars);

      console.log(`   📝 Rendered text: "${smsText?.substring(0, 50)}..."`);

      // Agar template render qilinmagan bo'lsa ({{}} bor bo'lsa), xatolik
      if (smsText && (smsText.includes('{{') || smsText.includes('}}'))) {
        logger.error(`   ❌ Template render qilinmadi! Text: "${smsText}"`);
        logger.error(`   ❌ Route template: "${route.sms_template}"`);
        logger.error(`   ❌ Template vars: ${JSON.stringify(templateVars)}`);
      }

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
          console.log(`   ✅ SMS yuborildi: ${toPhone}`);
          await logRouteSMS(routeId, toPhone, smsText, 'success', null);
          sentCount++;
        } else {
          const errorMsg = response.data?.error || response.data?.message || `Error code: ${response.data?.code || 'unknown'}`;
          logger.warn(`   ❌ SMS yuborilmadi: ${toPhone} (${errorMsg})`);
          await logRouteSMS(routeId, toPhone, smsText, 'failed', errorMsg);
          failedCount++;
        }

        // Har bir SMS o'rtasida 1 soniya kutish
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`   ❌ SMS xatosi: ${toPhone}`, error.message);
        await logRouteSMS(routeId, toPhone, smsText, 'failed', error.message);
        failedCount++;
      }
    }

    console.log(`\n📊 Natija: ${sentCount} muvaffaqiyatli, ${failedCount} xato`);

    // SMS yuborilgan telefon raqamlarni route_messages'da belgilash
    if (sentCount > 0) {
      try {
        const { query } = require('../database/sqlite');

        // Yuborilgan barcha raqamlarni olish
        const sentPhones = await query(
          `SELECT DISTINCT to_phone FROM route_sms_logs
           WHERE route_id = ? AND status = 'success' AND sent_at >= datetime('now', '-5 minutes')`,
          [routeId]
        );

        // Har bir telefon uchun route_messages'ni yangilash
        for (const { to_phone } of sentPhones) {
          await query(
            `UPDATE route_messages
             SET sms_sent = 1
             WHERE route_id = ? AND phone_numbers LIKE ?`,
            [routeId, `%${to_phone}%`]
          );
        }
      } catch (error) {
        logger.error('sms_sent flagni yangilashda xato:', error);
      }
    }

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

/**
 * Yo'nalish bo'yicha SMS yuborish - maxsus telefon raqamlarga (limitiz)
 * @param {number} routeId - Route ID
 * @param {Array<string>} phones - Telefon raqamlar ro'yxati
 * @param {string} message - SMS matni
 * @returns {Promise<Object>} - Natija
 */
async function sendRouteSMSToPhones(routeId, phones, customMessage = null) {
  try {
    const route = await getRouteById(routeId);
    if (!route) {
      return { success: false, error: 'Yo\'nalish topilmadi', sentCount: 0, failedCount: 0 };
    }

    console.log(`\n📲 Real-time SMS: ${route.name}`);
    console.log(`   Telefon soni: ${phones.length}`);

    if (phones.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0, message: 'Telefon raqam yo\'q' };
    }

    // SemySMS telefonlarni olish
    const semysmsPhones = await getActiveSemySMSPhones();
    if (semysmsPhones.length === 0) {
      console.log('   ❌ SemySMS telefonlar topilmadi');
      return { success: false, error: 'SemySMS telefonlar topilmadi', sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    // Har bir telefonga SMS yuborish
    for (const toPhone of phones) {
      // 2 SOATLIK COOLDOWN TEKSHIRUVI
      const canSend = await canSendSMS(routeId, toPhone);
      if (!canSend) {
        continue; // Keyingisiga o'tish (log canSendSMS ichida)
      }

      console.log(`   📞 SMS: ${toPhone}`);

      // Round-robin phone tanlash
      const semysmsPhone = semysmsPhones[currentPhoneIndex % semysmsPhones.length];
      currentPhoneIndex++;

      try {
        // SMS matn - shablon yoki custom message
        const templateVars = {
          phone: toPhone
        };

        const smsText = customMessage || renderSMSTemplate(route.sms_template, templateVars);

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
          console.log(`   ✅ SMS yuborildi: ${toPhone}`);
          await logRouteSMS(routeId, toPhone, smsText, 'success', null);
          sentCount++;
        } else {
          const errorMsg = response.data?.error || response.data?.message || `Error code: ${response.data?.code || 'unknown'}`;
          console.log(`   ❌ SMS yuborilmadi: ${toPhone} (${errorMsg})`);
          await logRouteSMS(routeId, toPhone, smsText, 'failed', errorMsg);
          failedCount++;
        }

        // Har bir SMS o'rtasida 1 soniya kutish
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`   ❌ SMS xatosi: ${toPhone}`, error.message);
        await logRouteSMS(routeId, toPhone, smsText || '', 'failed', error.message);
        failedCount++;
      }
    }

    console.log(`\n📊 Natija: ${sentCount} muvaffaqiyatli, ${failedCount} xato`);

    return {
      success: true,
      sentCount,
      failedCount,
      totalPhones: phones.length
    };

  } catch (error) {
    logger.error('❌ sendRouteSMSToPhones xatosi:', error);
    return { success: false, error: error.message, sentCount: 0, failedCount: 0 };
  }
}

/**
 * Route SMS service'ni ishga tushirish
 * Har 2 daqiqada yangi e'lonlarni tekshiradi va SMS yuboradi
 */
function startRouteSmsService() {
  console.log('🚀 Route SMS service boshlandi (har 2 daqiqada tekshirish)');

  // Dastlab 10 soniyadan keyin birinchi tekshirish
  setTimeout(async () => {
    await processAllRoutes();
  }, 10000);

  // Har 2 daqiqada tekshirish
  setInterval(async () => {
    await processAllRoutes();
  }, 2 * 60 * 1000); // 2 daqiqa
}

/**
 * Barcha faol routelarni qayta ishlash
 */
async function processAllRoutes() {
  try {
    const { getActiveRoutes } = require('../database/routes');
    const activeRoutes = await getActiveRoutes();

    if (activeRoutes.length === 0) {
      return;
    }

    console.log(`\n📋 ${activeRoutes.length} ta faol route tekshirilmoqda...`);

    let totalSent = 0;
    let totalFailed = 0;

    for (const route of activeRoutes) {
      try {
        const result = await sendRouteSMS(route.id);
        totalSent += result.sentCount || 0;
        totalFailed += result.failedCount || 0;

        if (result.sentCount > 0) {
          console.log(`✅ Route ${route.id} (${route.name}): ${result.sentCount} ta SMS yuborildi`);
        }
      } catch (error) {
        logger.error(`❌ Route ${route.id} xatosi:`, error);
      }
    }

    if (totalSent > 0 || totalFailed > 0) {
      console.log(`\n📊 Jami: ${totalSent} yuborildi, ${totalFailed} xato\n`);
    }
  } catch (error) {
    logger.error('processAllRoutes xatosi:', error);
  }
}

module.exports = {
  sendRouteSMS,
  sendRouteSMSToPhones,
  startRouteSmsService
};
