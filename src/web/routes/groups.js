const express = require('express');
const router = express.Router();
const { getAllGroups, createGroup, updateGroup, deleteGroup, getGroupById } = require('../../database/models');

// Server yoki Demo rejimga qarab to'g'ri service'ni tanlash
const MODE = process.env.MODE || 'demo';
const isServerMode = (MODE === 'server' || MODE === 'production');
const telegramService = isServerMode
  ? require('../../services/telegramClient')
  : require('../../services/telegramMonitor');

const { getDialogs } = telegramService;

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const groups = await getAllGroups();

    // Har bir guruh uchun a'zolar sonini olish
    let client;
    try {
      if (isServerMode) {
        const telegramClient = require('../../services/telegramClient');
        client = telegramClient.getClient();
      } else {
        const { getClient } = require('../../services/telegramMonitor');
        client = getClient();
      }

      if (client && client.connected) {
        // Parallel ravishda barcha guruhlar uchun a'zolar sonini olish
        const groupsWithMembers = await Promise.all(
          groups.map(async (group) => {
            try {
              const entity = await client.getEntity(group.telegram_id);

              let participantsCount = 0;
              try {
                const fullChat = await client.invoke(
                  new (require('telegram/tl')).Api.channels.GetFullChannel({
                    channel: entity
                  })
                );
                participantsCount = fullChat.fullChat.participantsCount || 0;
              } catch (e) {
                participantsCount = entity.participantsCount || 0;
              }

              return {
                ...group,
                member_count: participantsCount
              };
            } catch (error) {
              // Agar guruhni olish xato bersa, member_count = 0
              return {
                ...group,
                member_count: 0
              };
            }
          })
        );

        return res.render('groups/list', {
          groups: groupsWithMembers,
          username: req.session.username
        });
      }
    } catch (clientError) {
      console.error('Telegram client error:', clientError);
    }

    // Agar client yo'q bo'lsa, oddiy guruhlarni ko'rsatish
    res.render('groups/list', { groups, username: req.session.username });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Qo'shish sahifasi
router.get('/add', async (req, res) => {
  try {
    const dialogs = await getDialogs();
    res.render('groups/add', { dialogs, error: null, username: req.session.username });
  } catch (error) {
    res.render('groups/add', { dialogs: [], error: error.message, username: req.session.username });
  }
});

// Qo'shish
router.post('/add', async (req, res) => {
  try {
    const { name, telegram_id, keywords, sms_template } = req.body;

    // Max 50 ta limit
    const allGroups = await getAllGroups();
    if (allGroups.length >= 50) {
      const dialogs = await getDialogs();
      return res.render('groups/add', {
        dialogs,
        error: 'Maksimum 50 ta guruh qo\'shish mumkin',
        username: req.session.username
      });
    }

    await createGroup(name, telegram_id, keywords, sms_template);
    res.redirect('/groups');
  } catch (error) {
    const dialogs = await getDialogs();
    res.render('groups/add', { dialogs, error: error.message, username: req.session.username });
  }
});

// Tahrirlash sahifasi
router.get('/edit/:id', async (req, res) => {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) {
      return res.redirect('/groups');
    }
    res.render('groups/edit', { group, error: null, username: req.session.username });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Tahrirlash
router.post('/edit/:id', async (req, res) => {
  try {
    const { name, keywords, sms_template, active, sms_enabled } = req.body;
    await updateGroup(req.params.id, {
      name,
      keywords,
      sms_template,
      active: active === 'on',
      sms_enabled: sms_enabled === 'on'
    });
    res.redirect('/groups');
  } catch (error) {
    const group = await getGroupById(req.params.id);
    res.render('groups/edit', { group, error: error.message, username: req.session.username });
  }
});

// O'chirish (POST - eski usul) - FAQAT monitoring'dan o'chirish
router.post('/delete/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);

    if (group) {
      console.log(`ℹ️ Guruh monitoring'dan o'chirildi (Telegram'dan chiqilmadi): ${group.name}`);
    }

    // Database'dan o'chirish - Telegram'dan CHIQMASLIK!
    await deleteGroup(groupId);
    res.redirect('/groups');
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// O'chirish (DELETE - AJAX uchun) - FAQAT monitoring'dan o'chirish
router.delete('/delete/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);

    // Guruh ma'lumotlarini olish
    const group = await getGroupById(groupId);
    if (!group) {
      return res.json({ success: false, error: 'Guruh topilmadi' });
    }

    console.log(`ℹ️ Guruh monitoring'dan o'chirildi (Telegram'dan chiqilmadi): ${group.name}`);

    // Database'dan o'chirish - Telegram'dan CHIQMASLIK!
    await deleteGroup(groupId);

    res.json({
      success: true,
      message: `${group.name} monitoring'dan o'chirildi. Telegram guruhida qolasiz.`
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Guruhdan chiqish (alohida route - agar kerak bo'lsa)
router.post('/leave/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const group = await getGroupById(groupId);

    if (!group) {
      return res.json({ success: false, error: 'Guruh topilmadi' });
    }

    // Telegram guruhidan chiqish
    try {
      let client;
      if (isServerMode) {
        const telegramClient = require('../../services/telegramClient');
        client = telegramClient.getClient();
      } else {
        const { getClient } = require('../../services/telegramMonitor');
        client = getClient();
      }

      if (client && client.connected) {
        const entity = await client.getEntity(group.telegram_id);

        // Guruhdan chiqish
        await client.invoke(
          new (require('telegram/tl')).Api.channels.LeaveChannel({
            channel: entity
          })
        );

        console.log(`✓ Telegram guruhidan chiqildi: ${group.name}`);

        // Database'dan ham o'chirish
        await deleteGroup(groupId);

        return res.json({
          success: true,
          message: `${group.name} guruhidan chiqildi va monitoring'dan o'chirildi`
        });
      } else {
        return res.json({
          success: false,
          error: 'Telegram client ulanmagan'
        });
      }
    } catch (telegramError) {
      console.error('Telegram guruhidan chiqishda xato:', telegramError);
      return res.json({
        success: false,
        error: `Guruhdan chiqib bo'lmadi: ${telegramError.message}`
      });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Telegram guruhlar ro'yxati (barcha guruhlar - monitoring bo'lmagan ham)
router.get('/telegram-groups', async (req, res) => {
  try {
    // Telegram client olish
    let client;
    if (isServerMode) {
      const telegramClient = require('../../services/telegramClient');
      client = telegramClient.getClient();
    } else {
      const { getClient } = require('../../services/telegramMonitor');
      client = getClient();
    }

    if (!client || !client.connected) {
      return res.render('groups/telegram-list', {
        telegramGroups: [],
        monitoredIds: [],
        error: 'Telegram client ulanmagan',
        username: req.session.username
      });
    }

    // Barcha Telegram dialoglarni olish
    const dialogs = await client.getDialogs({ limit: 200 });

    // Faqat guruhlar va kanallar
    const groups = dialogs.filter(dialog =>
      dialog.isGroup || dialog.isChannel
    );

    // Database'dagi monitoring guruhlar
    const monitoredGroups = await getAllGroups();
    const monitoredIds = monitoredGroups.map(g => g.telegram_id.toString());

    // Guruhlarni formatlash
    const telegramGroups = groups.map(dialog => {
      let telegramId = dialog.id.toString();

      // Channel/Megagroup uchun -100 prefix
      if (dialog.entity.className === 'Channel' && !telegramId.startsWith('-')) {
        telegramId = '-100' + telegramId;
      }

      return {
        id: telegramId,
        title: dialog.title || dialog.name,
        username: dialog.entity.username || null,
        participantsCount: dialog.entity.participantsCount || 0,
        isMonitored: monitoredIds.includes(telegramId)
      };
    });

    res.render('groups/telegram-list', {
      telegramGroups,
      monitoredIds,
      error: null,
      username: req.session.username
    });

  } catch (error) {
    console.error('Telegram groups list error:', error);
    res.render('groups/telegram-list', {
      telegramGroups: [],
      monitoredIds: [],
      error: error.message,
      username: req.session.username
    });
  }
});

// Guruhga join qilish (database ID bo'yicha)
router.post('/join/:id', async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const group = await getGroupById(groupId);

    if (!group) {
      return res.json({ success: false, error: 'Guruh topilmadi' });
    }

    // Telegram client olish
    let client;
    if (isServerMode) {
      const telegramClient = require('../../services/telegramClient');
      client = telegramClient.getClient();
    } else {
      const { getClient } = require('../../services/telegramMonitor');
      client = getClient();
    }

    if (!client || !client.connected) {
      return res.json({ success: false, error: 'Telegram client ulanmagan' });
    }

    // Guruhga join qilish
    try {
      const { Api } = require('telegram/tl');

      // Avval guruhni entity sifatida olishga harakat qilamiz
      let entity;
      try {
        entity = await client.getEntity(group.telegram_id);
        console.log(`✓ Entity topildi: ${group.name}`);
      } catch (entityError) {
        // Entity topilmasa - private guruh yoki access yo'q
        return res.json({
          success: false,
          error: `Bu guruhga avtomatik join qilib bo'lmaydi.\n\n` +
            `Sabab: Private guruh yoki invite link kerak.\n\n` +
            `Qanday qilish:\n` +
            `1. Telegramda guruhga qo'lda join qiling (invite link orqali)\n` +
            `2. Keyin bu yerda yana "Join" tugmasini bosing\n\n` +
            `ID: ${group.telegram_id}`
        });
      }

      // Username bilan join qilish (agar bor bo'lsa)
      if (group.telegram_id.startsWith('@') || entity.username) {
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: entity
          })
        );
      } else {
        // ID bilan join qilishga harakat
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: entity
          })
        );
      }

      console.log(`✓ Guruhga join qilindi: ${group.name} (${group.telegram_id})`);

      res.json({
        success: true,
        message: `Guruhga muvaffaqiyatli join qilindi: ${group.name}`
      });

    } catch (joinError) {
      console.error('Join error:', joinError);

      // Agar allaqachon a'zo bo'lsa
      if (joinError.message && joinError.message.includes('USER_ALREADY_PARTICIPANT')) {
        return res.json({
          success: true,
          message: `Siz allaqachon guruh a'zosisiz: ${group.name}`
        });
      }

      // INVITE_HASH_INVALID - invite link kerak
      if (joinError.errorMessage === 'CHANNEL_PRIVATE' || joinError.errorMessage === 'INVITE_HASH_INVALID') {
        return res.json({
          success: false,
          error: `Bu guruh private - invite link orqali qo'lda join qiling!`
        });
      }

      throw joinError;
    }

  } catch (error) {
    console.error('Group join error:', error);
    res.json({
      success: false,
      error: `Guruhga join qilib bo'lmadi: ${error.message}`
    });
  }
});

// Guruhni qidirish (ID yoki username bilan)
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.json({
        success: false,
        error: 'Guruh ID yoki username kiriting'
      });
    }

    // Telegram client olish
    let client;
    if (isServerMode) {
      const telegramClient = require('../../services/telegramClient');
      client = telegramClient.getClient();
    } else {
      const { getClient } = require('../../services/telegramMonitor');
      client = getClient();
    }

    if (!client || !client.connected) {
      return res.json({
        success: false,
        error: 'Telegram client ulanmagan'
      });
    }

    // Guruhni qidirish
    const searchQuery = query.trim();
    const entity = await client.getEntity(searchQuery);

    if (!entity) {
      return res.json({
        success: false,
        error: 'Guruh topilmadi'
      });
    }

    // A'zolar sonini olish
    let participantsCount = 0;
    try {
      const fullChat = await client.invoke(
        new (require('telegram/tl')).Api.channels.GetFullChannel({
          channel: entity
        })
      );
      participantsCount = fullChat.fullChat.participantsCount || 0;
    } catch (e) {
      // Agar GetFullChannel ishlamasa, entity'dan olishga harakat qilamiz
      participantsCount = entity.participantsCount || 0;
    }

    // Guruh ID ni to'g'ri formatga aylantirish
    let telegramId = entity.id.toString();

    // Agar Channel/Megagroup bo'lsa va -100 prefix yo'q bo'lsa, qo'shish
    if (entity.className === 'Channel' && !telegramId.startsWith('-')) {
      telegramId = '-100' + telegramId;
    }

    // Guruh ma'lumotlarini qaytarish
    res.json({
      success: true,
      group: {
        id: telegramId,
        title: entity.title,
        username: entity.username || null,
        participantsCount: participantsCount,
        description: entity.about || null
      }
    });

  } catch (error) {
    console.error('Group search error:', error);
    res.json({
      success: false,
      error: 'Guruh topilmadi yoki xato yuz berdi: ' + error.message
    });
  }
});

module.exports = router;
