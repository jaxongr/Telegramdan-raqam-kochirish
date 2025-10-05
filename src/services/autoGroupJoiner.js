const logger = require('../utils/logger');
const { getActiveAccounts, db } = require('../database/sqlite');
const { getClient } = require('./multiAccountManager');
const { Api } = require('telegram');

/**
 * AVTOMATIK GURUHGA QOSHILISH
 * Akkaunt guruhga invite link yoki telegram ID orqali qo'shiladi
 */
async function joinGroupAutomatically(accountId, groupInfo) {
  try {
    const client = await getClient(accountId);

    // 1-usul: Username bor bo'lsa (eng oson)
    if (groupInfo.username) {
      const inviteLink = `https://t.me/${groupInfo.username}`;
      logger.info(`  ↗️  Username orqali: ${inviteLink}`);

      await client.invoke(
        new Api.channels.JoinChannel({
          channel: groupInfo.username
        })
      );

      logger.info(`    ✓ Muvaffaqiyatli join qilindi: ${groupInfo.title}`);
      return { success: true };
    }

    // 2-usul: Telegram ID orqali (public guruhlar uchun)
    if (groupInfo.telegramId) {
      logger.info(`  ↗️  Telegram ID orqali: ${groupInfo.telegramId}`);

      try {
        // ID orqali entity olish
        const entity = await client.getEntity(groupInfo.telegramId);

        // Join qilish
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: entity
          })
        );

        logger.info(`    ✓ Muvaffaqiyatli join qilindi: ${groupInfo.title}`);
        return { success: true };

      } catch (idError) {
        logger.warn(`    ⚠️  ID orqali join bo'lmadi: ${idError.message}`);
        // Keyingi usulga o'tamiz
      }
    }

    // 3-usul: Invite hash bor bo'lsa
    if (groupInfo.inviteHash) {
      logger.info(`  ↗️  Invite hash orqali`);

      await client.invoke(
        new Api.messages.ImportChatInvite({
          hash: groupInfo.inviteHash
        })
      );

      logger.info(`    ✓ Muvaffaqiyatli join qilindi: ${groupInfo.title}`);
      return { success: true };
    }

    // Hech qanday usul ishlamadi
    logger.warn(`    ❌ Join qilib bo'lmadi: ${groupInfo.title} - Ma'lumot yetarli emas`);
    return {
      success: false,
      error: 'Username yoki invite link yo\'q'
    };

  } catch (error) {
    logger.error(`    ❌ Join xatosi: ${groupInfo.title} - ${error.message}`);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * TO'LIQ AVTOMATIK REBALANCE
 * Ko'p guruhli akkauntdan leave qiladi va kam guruhli akkauntga join qiladi
 */
async function fullyAutomaticRebalance() {
  const accounts = getActiveAccounts();

  if (accounts.length < 2) {
    logger.warn('Kamida 2 ta akkaunt kerak!');
    return { success: false, reason: 'Kam akkaunt' };
  }

  logger.info(`🔄 TO'LIQ AVTOMATIK REBALANCE boshlandi...`);

  // Har bir akkauntdagi guruhlarni yig'ish
  const accountGroups = new Map();

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);
      const dialogs = await client.getDialogs({ limit: 500 });

      const groups = [];
      for (const dialog of dialogs) {
        const entity = dialog.entity;

        if (entity.className === 'Channel' || entity.className === 'Chat') {
          groups.push({
            telegramId: entity.id.toString(),
            title: entity.title || 'Nomsiz guruh',
            username: entity.username,
            accessHash: entity.accessHash,
            entity: entity
          });
        }
      }

      accountGroups.set(account.id, {
        phone: account.phone,
        groups: groups,
        count: groups.length
      });

      logger.info(`  📱 ${account.phone}: ${groups.length} guruh`);

    } catch (error) {
      logger.error(`  ✗ ${account.phone}: xato - ${error.message}`);
    }
  }

  // O'rtacha hisoblash
  const totalGroups = Array.from(accountGroups.values()).reduce((sum, acc) => sum + acc.count, 0);
  const averageGroups = Math.floor(totalGroups / accounts.length);

  logger.info(`\n📊 O'rtacha: ${averageGroups} guruh/akkaunt`);

  // Ko'p va kam akkauntlarni topish
  const overloaded = [];
  const underloaded = [];

  for (const [accountId, data] of accountGroups.entries()) {
    if (data.count > averageGroups + 5) {
      overloaded.push({ accountId, ...data, excess: data.count - averageGroups });
      logger.info(`  🔴 ${data.phone}: ${data.count} (+${data.count - averageGroups})`);
    } else if (data.count < averageGroups - 5) {
      underloaded.push({ accountId, ...data, shortage: averageGroups - data.count });
      logger.info(`  🟢 ${data.phone}: ${data.count} (-${averageGroups - data.count})`);
    }
  }

  if (overloaded.length === 0 || underloaded.length === 0) {
    logger.info('\n✅ Allaqachon balansda!');
    return { success: true, balanced: true };
  }

  // REBALANCE JARAYONI
  logger.info(`\n🔄 Rebalance jarayoni:`);

  let totalMoved = 0;

  for (const over of overloaded) {
    if (underloaded.length === 0) break;

    const fromAccount = accounts.find(a => a.id === over.accountId);
    const fromClient = await getClient(fromAccount.id);

    // Leave qilinadigan guruhlar
    const groupsToMove = over.groups.slice(0, over.excess);

    logger.info(`\n  📤 ${over.phone}'dan ${groupsToMove.length} guruh ko'chirilmoqda...`);

    for (const group of groupsToMove) {
      if (underloaded.length === 0) break;

      // Target akkaunt (eng kam guruhga ega)
      underloaded.sort((a, b) => a.count - b.count);
      const target = underloaded[0];
      const toAccount = accounts.find(a => a.id === target.accountId);

      logger.info(`\n    🔄 "${group.title}"`);
      logger.info(`       ${over.phone} → ${target.phone}`);

      try {
        // 1. Target akkauntga join qilish
        logger.info(`       1/2: Join qilinyapti...`);
        const joinResult = await joinGroupAutomatically(toAccount.id, group);

        if (!joinResult.success) {
          logger.warn(`       ⚠️  Join bo'lmadi: ${joinResult.error}`);
          continue;
        }

        // Delay (flood wait dan qochish)
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 2. Eski akkauntdan leave qilish
        logger.info(`       2/2: Leave qilinyapti...`);

        if (group.entity.className === 'Channel') {
          await fromClient.invoke(
            new Api.channels.LeaveChannel({
              channel: group.entity
            })
          );
        } else {
          await fromClient.invoke(
            new Api.messages.DeleteChatUser({
              chatId: group.entity.id,
              userId: 'me'
            })
          );
        }

        logger.info(`       ✅ Muvaffaqiyatli ko'chirildi!`);

        // Hisoblagichlarni yangilash
        over.count--;
        target.count++;
        totalMoved++;

        // Agar target akkaunt to'ldi bo'lsa, ro'yxatdan o'chirish
        if (target.count >= averageGroups) {
          underloaded.shift();
        }

        // Delay
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        logger.error(`       ❌ Xato: ${error.message}`);
      }
    }
  }

  logger.info(`\n✅ Rebalance tugadi!`);
  logger.info(`   Ko'chirildi: ${totalMoved} guruh`);

  // Yangi balans
  logger.info(`\n📊 Yangi balans:`);
  for (const [accountId, data] of accountGroups.entries()) {
    logger.info(`   ${data.phone}: ${data.count} guruh`);
  }

  return {
    success: true,
    totalMoved,
    balanced: true
  };
}

module.exports = {
  joinGroupAutomatically,
  fullyAutomaticRebalance
};
