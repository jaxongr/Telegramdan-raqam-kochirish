// Bu faylni smsService.js ga nusxa ko'chirish kerak
// Faqat sendSMS funksiyasini to'liq qayta yozdim

async function sendSMS(toPhone, groupId, messageText, templateVars = null, retryCount = 0) {
  try {
    // Retry limit
    if (retryCount >= 4) {
      logger.error(`❌ ${toPhone} uchun maksimal retry limitga yetildi (${retryCount})`);
      await logSMS(toPhone, groupId, messageText, null, 'failed', 'Max retry limit reached');
      return { success: false, error: 'max_retry_limit' };
    }

    // Input validation
    if (!toPhone || !messageText) {
      logger.error('SMS yuborish: telefon yoki xabar bo\'sh');
      return { success: false, error: 'invalid_input' };
    }

    // Agar shablon o'zgaruvchilari berilgan bo'lsa, shablonni render qilish
    let renderedText = messageText;
    if (templateVars) {
      renderedText = renderSMSTemplate(messageText, templateVars);
      logger.info(`📝 SMS shablon render qilindi: ${renderedText.substring(0, 50)}...`);
    }

    // Qora ro'yxat tekshirish
    const blacklisted = await isBlacklisted(toPhone);
    if (blacklisted) {
      logger.warn(`🚫 Qora ro'yxatda: ${toPhone} - SMS yuborilmaydi`);
      await logSMS(toPhone, groupId, renderedText, null, 'blocked', 'Blacklisted');
      return { success: false, error: 'blacklisted' };
    }

    // CRITICAL FIX: Database-based lock
    // Birinchi marta pending log qilamiz - bu atomik lock vazifasini bajaradi
    if (retryCount === 0) {
      // Cooldown tekshirish (oxirgi SMS dan 2 soat o'tganmi?)
      const lastSMS = await getLastSMSTime(toPhone);
      logger.info(`🔍 Cooldown check: ${toPhone} - Last SMS: ${lastSMS || 'none'}`);

      if (lastSMS) {
        const hoursSinceLastSMS = (Date.now() - new Date(lastSMS).getTime()) / (1000 * 60 * 60);
        logger.info(`⏱ Hours since last SMS: ${hoursSinceLastSMS.toFixed(2)} / ${SMS_COOLDOWN_HOURS}`);

        if (hoursSinceLastSMS < SMS_COOLDOWN_HOURS) {
          const remainingMinutes = Math.ceil((SMS_COOLDOWN_HOURS - hoursSinceLastSMS) * 60);
          logger.warn(`⏸ ${toPhone} uchun cooldown: ${remainingMinutes} daqiqa qoldi`);
          await logSMS(toPhone, groupId, renderedText, null, 'cooldown', `Cooldown active: ${remainingMinutes} minutes remaining`);
          return { success: false, error: 'cooldown_active', remainingMinutes };
        }
      }

      // ATOMIK LOCK: Pending qo'yish - bu joydan keyin boshqa guruhlar cooldown ko'radi
      await logSMS(toPhone, groupId, renderedText, null, 'pending', 'SMS yuborilmoqda...');
      logger.info(`🔐 Database lock (pending): ${toPhone}`);
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
      await logSMS(toPhone, groupId, renderedText, null, 'failed', 'No active SemySMS phones');
      return { success: false, error: 'no_semysms_phones' };
    }

    // Round-robin: navbatdagi telefonni tanlash
    const senderPhone = selectNextPhone(semysmsPhones);
    if (!senderPhone) {
      logger.error('Barcha SemySMS telefonlar ishlamayapti');
      await logSMS(toPhone, groupId, renderedText, null, 'failed', 'All phones unavailable');
      return { success: false, error: 'all_phones_unavailable' };
    }

    // Balansni tekshirish
    const balance = await checkBalance(senderPhone.phone);
    if (balance !== null && balance < 1) {
      logger.warn(`${senderPhone.phone} balans yetarli emas (${balance}) - keyingi telefon bilan urinish (retry: ${retryCount + 1})`);
      await updateSemySMSPhone(senderPhone.phone, { status: 'low_balance' });
      return await sendSMS(toPhone, groupId, messageText, templateVars, retryCount + 1);
    }

    // SMS matnini tayyorlash
    const smsText = prepareSMSText(renderedText);

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
        return await sendSMS(toPhone, groupId, messageText, templateVars, retryCount + 1);
      }

      return { success: false, error: result.error };
    }

  } catch (error) {
    logger.error('SMS yuborishda xato:', error);
    await logSMS(toPhone, groupId, messageText, null, 'failed', error.message);
    return { success: false, error: error.message };
  }
}
