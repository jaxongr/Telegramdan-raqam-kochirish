const logger = require('../utils/logger');
const { getActiveAccounts, getAllGroups, db } = require('../database/sqlite');
const { getClient } = require('./multiAccountManager');
const { Api } = require('telegram');

/**
 * SMART BALANCING - Guruhlarni akkauntlar o'rtasida balanslash
 *
 * Strategiya:
 * 1. Har bir akkauntdagi guruhlar sonini hisoblash
 * 2. Agar bir akkaunt ko'p bo'lsa, ortiqcha guruhlardan leave qilish
 * 3. Leave qilingan guruhlar haqida ma'lumot berish (admin qo'lda qo'shishi kerak)
 */
async function balanceGroupsAcrossAccounts() {
  const accounts = getActiveAccounts();

  if (accounts.length < 2) {
    logger.warn('Kamida 2 ta akkaunt kerak!');
    return { balanced: false, reason: 'Kam akkaunt' };
  }

  logger.info(`⚖️ Guruhlarni balanslash boshlandi...`);

  // Har bir akkauntdagi guruhlar sonini hisoblash
  const accountGroupCounts = new Map();

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);
      const dialogs = await client.getDialogs({ limit: 500 });

      let groupCount = 0;
      for (const dialog of dialogs) {
        const entity = dialog.entity;
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          groupCount++;
        }
      }

      accountGroupCounts.set(account.id, {
        phone: account.phone,
        count: groupCount,
        groups: []
      });

      logger.info(`  📱 ${account.phone}: ${groupCount} guruh`);

    } catch (error) {
      logger.error(`  ✗ ${account.phone}: xato - ${error.message}`);
    }
  }

  // O'rtacha guruhlar sonini hisoblash
  const totalGroups = Array.from(accountGroupCounts.values()).reduce((sum, acc) => sum + acc.count, 0);
  const averageGroups = Math.floor(totalGroups / accounts.length);

  logger.info(`\n📊 Statistika:`);
  logger.info(`   Jami guruhlar: ${totalGroups}`);
  logger.info(`   O'rtacha (ideal): ${averageGroups} guruh/akkaunt`);

  // Qaysi akkauntlar ko'p, qaysilari kam ekanini aniqlash
  const overloadedAccounts = [];
  const underloadedAccounts = [];

  for (const [accountId, data] of accountGroupCounts.entries()) {
    const diff = data.count - averageGroups;

    if (diff > 5) {
      overloadedAccounts.push({ accountId, ...data, excess: diff });
      logger.info(`   🔴 ${data.phone}: ${data.count} guruh (+${diff} ortiq)`);
    } else if (diff < -5) {
      underloadedAccounts.push({ accountId, ...data, shortage: Math.abs(diff) });
      logger.info(`   🟢 ${data.phone}: ${data.count} guruh (${Math.abs(diff)} kam)`);
    } else {
      logger.info(`   ⚪ ${data.phone}: ${data.count} guruh (balansda)`);
    }
  }

  if (overloadedAccounts.length === 0) {
    logger.info('\n✅ Barcha akkauntlar allaqachon balansda!');
    return { balanced: true, changes: [] };
  }

  // Ortiqcha akkauntlardan guruhlarni leave qilish
  logger.info(`\n🔄 Balanslash jarayoni:`);

  const suggestions = [];
  let totalLeft = 0;

  for (const overloaded of overloadedAccounts) {
    const account = accounts.find(a => a.id === overloaded.accountId);
    const client = await getClient(account.id);
    const dialogs = await client.getDialogs({ limit: 500 });

    let leftCount = 0;
    const leftGroups = [];

    logger.info(`\n  📱 ${account.phone} dan ${overloaded.excess} guruh leave qilinmoqda...`);

    for (const dialog of dialogs) {
      if (leftCount >= overloaded.excess) break;

      const entity = dialog.entity;

      if (entity.className === 'Channel' || entity.className === 'Chat') {
        const title = entity.title || 'Nomsiz guruh';

        try {
          // Guruhdan chiqish
          if (entity.className === 'Channel') {
            await client.invoke(
              new Api.channels.LeaveChannel({ channel: entity })
            );
          } else {
            await client.invoke(
              new Api.messages.DeleteChatUser({
                chatId: entity.id,
                userId: 'me'
              })
            );
          }

          logger.info(`    ✓ LEFT: ${title}`);
          leftGroups.push({
            title,
            telegramId: entity.id.toString(),
            username: entity.username
          });

          leftCount++;
          totalLeft++;

          // Delay
          await new Promise(resolve => setTimeout(resolve, 1500));

        } catch (error) {
          logger.error(`    ✗ ${title}: ${error.message}`);
        }
      }
    }

    // Kam akkauntlarga qo'shish uchun tavsiyalar
    if (leftGroups.length > 0 && underloadedAccounts.length > 0) {
      const targetAccount = underloadedAccounts[0]; // Eng kam akkaunt

      suggestions.push({
        fromAccount: account.phone,
        toAccount: targetAccount.phone,
        groups: leftGroups,
        count: leftGroups.length
      });
    }

    logger.info(`  📊 ${account.phone}: ${leftCount} guruhdan chiqildi`);
  }

  // Natija
  logger.info(`\n✅ Balanslash tugadi!`);
  logger.info(`   Jami leave qilingan: ${totalLeft} guruh`);

  if (suggestions.length > 0) {
    logger.info(`\n💡 QOLDA QO'SHISH KERAK:`);
    for (const sug of suggestions) {
      logger.info(`\n   ${sug.toAccount} akkauntga ${sug.count} guruh qo'shish kerak:`);
      sug.groups.forEach((g, i) => {
        const inviteLink = g.username ? `https://t.me/${g.username}` : `Telegram ID: ${g.telegramId}`;
        logger.info(`     ${i + 1}. ${g.title} - ${inviteLink}`);
      });
    }
  }

  return {
    balanced: true,
    totalLeft,
    suggestions,
    message: `${totalLeft} guruhdan chiqildi. ${suggestions.length} akkauntga qo'lda qo'shish kerak.`
  };
}

/**
 * Har bir akkauntdagi guruhlar sonini ko'rsatish
 */
async function showAccountBalance() {
  const accounts = getActiveAccounts();
  const balances = [];

  for (const account of accounts) {
    try {
      const client = await getClient(account.id);
      const dialogs = await client.getDialogs({ limit: 500 });

      let groupCount = 0;
      for (const dialog of dialogs) {
        const entity = dialog.entity;
        if (entity.className === 'Channel' || entity.className === 'Chat') {
          groupCount++;
        }
      }

      balances.push({
        phone: account.phone,
        groups: groupCount
      });

    } catch (error) {
      balances.push({
        phone: account.phone,
        groups: 0,
        error: error.message
      });
    }
  }

  return balances;
}

module.exports = {
  balanceGroupsAcrossAccounts,
  showAccountBalance
};
