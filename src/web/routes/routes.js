const express = require('express');
const router = express.Router();
const {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  findMatchingPhones,
  getRouteStatistics,
  getRouteMessages,
  getRouteMessageCount,
  getRouteMessageById,
  markMessageAsSent
} = require('../../database/routes');
const { sendRouteSMS, sendRouteSMSToPhones } = require('../../services/routeSmsService');

// Ro'yxat - Viloyatlar bo'yicha guruhlangan
router.get('/', async (req, res) => {
  try {
    const routes = await getAllRoutes();

    // Har bir route uchun statistika va e'lonlar soni
    const routesWithStats = await Promise.all(
      routes.map(async (route) => {
        const stats = await getRouteStatistics(route.id);
        const messageCount = await getRouteMessageCount(route.id);
        return {
          ...route,
          totalSent: stats.total,
          successSent: stats.success,
          messageCount: messageCount
        };
      })
    );

    // YANGI: Shaharlar bo'yicha guruhlash (viloyat emas, aniq shahar!)
    // Har bir route uchun from_keywords'dagi BIRINCHI shaharni olish
    const groupedRoutes = {};
    routesWithStats.forEach(route => {
      // from_keywords'dan birinchi kalit so'zni olish (aniq shahar nomi)
      const fromKeywords = route.from_keywords.split(',').map(k => k.trim());
      const firstCity = fromKeywords[0] || route.name.split(' → ')[0].trim();

      // Capitalize qilish
      const cityKey = firstCity.charAt(0).toUpperCase() + firstCity.slice(1);

      if (!groupedRoutes[cityKey]) {
        groupedRoutes[cityKey] = [];
      }
      groupedRoutes[cityKey].push(route);
    });

    // Viloyatlarni alfabetik tartibda saralash
    const sortedRegions = Object.keys(groupedRoutes).sort();

    res.render('routes/list', {
      groupedRoutes,
      sortedRegions,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Routes list error:', error);
    res.status(500).send('Xatolik yuz berdi');
  }
});

// Qo'shish sahifasi - YANGI: Ikkita konsul (Toshkentdan/Toshkentga)
router.get('/add', (req, res) => {
  res.render('routes/add_simple', { page: 'routes', username: req.session.username });
});

// YANGI: Toshkentdan viloyatlarga (GET) - FAQAT VILOYATLAR
router.get('/add/from-tashkent', async (req, res) => {
  try {
    const allRoutes = await getAllRoutes();

    // FAQAT viloyat yo'nalishlari: "Toshkent → Viloyat" (tumanlar yo'q!)
    const fromTashkentRoutes = allRoutes.filter(route => {
      if (!route.from_keywords || !route.from_keywords.toLowerCase().includes('toshkent')) {
        return false;
      }

      // Yo'nalish nomi: "Toshkent → X" formatida bo'lishi kerak
      const routeName = route.name.trim();
      const parts = routeName.split('→').map(p => p.trim());

      if (parts.length !== 2) return false;

      // Birinchi qism FAQAT "Toshkent" bo'lishi kerak (tumanlar yo'q!)
      return parts[0].toLowerCase() === 'toshkent';
    });

    // Har bir route uchun statistika
    const routesWithStats = await Promise.all(
      fromTashkentRoutes.map(async (route) => {
        const stats = await getRouteStatistics(route.id);
        const messageCount = await getRouteMessageCount(route.id);
        return {
          ...route,
          totalSent: stats.total,
          successSent: stats.success,
          messageCount: messageCount
        };
      })
    );

    res.render('routes/direction_list', {
      routes: routesWithStats,
      direction: 'from-tashkent',
      title: 'Toshkentdan viloyatlarga',
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('From Tashkent list error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// YANGI: Viloyatlardan Toshkentga (GET) - FAQAT VILOYATLAR
router.get('/add/to-tashkent', async (req, res) => {
  try {
    const allRoutes = await getAllRoutes();

    // FAQAT viloyat yo'nalishlari: "Viloyat → Toshkent" (tumanlar yo'q!)
    const toTashkentRoutes = allRoutes.filter(route => {
      if (!route.to_keywords || !route.to_keywords.toLowerCase().includes('toshkent')) {
        return false;
      }

      // Yo'nalish nomi: "X → Toshkent" formatida bo'lishi kerak
      const routeName = route.name.trim();
      const parts = routeName.split('→').map(p => p.trim());

      if (parts.length !== 2) return false;

      // Ikkinchi qism FAQAT "Toshkent" bo'lishi kerak (tumanlar yo'q!)
      return parts[1].toLowerCase() === 'toshkent';
    });

    // Har bir route uchun statistika
    const routesWithStats = await Promise.all(
      toTashkentRoutes.map(async (route) => {
        const stats = await getRouteStatistics(route.id);
        const messageCount = await getRouteMessageCount(route.id);
        return {
          ...route,
          totalSent: stats.total,
          successSent: stats.success,
          messageCount: messageCount
        };
      })
    );

    res.render('routes/direction_list', {
      routes: routesWithStats,
      direction: 'to-tashkent',
      title: 'Viloyatlardan Toshkentga',
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('To Tashkent list error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// YANGI: Viloyat tumanlarini ko'rsatish
router.get('/region/:regionName', async (req, res) => {
  try {
    const regionName = decodeURIComponent(req.params.regionName);
    const direction = req.query.direction || 'to-tashkent'; // Default: viloyatdan Toshkentga
    const allRoutes = await getAllRoutes();

    // Direction ga qarab yo'nalishlarni filtrlash
    let regionRoutes;
    if (direction === 'from-tashkent') {
      // Toshkentdan viloyatga: "Toshkent → Qashqadaryo (Tuman)"
      regionRoutes = allRoutes.filter(route => {
        const routeName = route.name.toLowerCase();
        return routeName.startsWith('toshkent →') &&
               routeName.includes(regionName.toLowerCase());
      });
    } else {
      // Viloyatdan Toshkentga: "Qashqadaryo (Tuman) → Toshkent"
      regionRoutes = allRoutes.filter(route =>
        route.name.toLowerCase().startsWith(regionName.toLowerCase()) &&
        route.name.toLowerCase().includes('toshkent')
      );
    }

    if (regionRoutes.length === 0) {
      return res.redirect('/routes?error=' + encodeURIComponent('Viloyat topilmadi'));
    }

    // Har bir route uchun statistika va unikal raqamlar
    const routesWithStats = await Promise.all(
      regionRoutes.map(async (route) => {
        const stats = await getRouteStatistics(route.id);
        const messageCount = await getRouteMessageCount(route.id);

        // Unikal telefon raqamlarni hisoblash
        const messages = await getRouteMessages(route.id, 10000); // Barcha xabarlar
        const allPhones = messages.flatMap(msg => msg.phone_numbers || []);
        const uniquePhones = new Set(allPhones);

        return {
          ...route,
          totalSent: stats.total,
          successSent: stats.success,
          messageCount: messageCount,
          uniquePhones: uniquePhones.size
        };
      })
    );

    res.render('routes/region_districts', {
      routes: routesWithStats,
      regionName: regionName,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Region districts error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// YANGI: Toshkentdan viloyatlarga (POST)
router.post('/add/from-tashkent', async (req, res) => {
  try {
    const regions = req.body.regions;
    if (!regions || (Array.isArray(regions) && regions.length === 0)) {
      return res.redirect('/routes/add/from-tashkent?error=' + encodeURIComponent('Viloyat tanlanmadi'));
    }

    const selectedRegions = Array.isArray(regions) ? regions : [regions];

    for (const region of selectedRegions) {
      const regionName = region.charAt(0).toUpperCase() + region.slice(1);
      await createRoute(
        `Toshkent → ${regionName}`,
        'toshkent,toshkentdan,тошкент',
        region.toLowerCase(),
        `Assalomu alaykum! Toshkentdan ${regionName}ga yo'lovchi kerak.`,
        30
      );
    }

    res.redirect('/routes?success=' + encodeURIComponent(`${selectedRegions.length} ta yo'nalish qo'shildi`));
  } catch (error) {
    console.error('From Tashkent add error:', error);
    res.redirect('/routes/add/from-tashkent?error=' + encodeURIComponent(error.message));
  }
});

// YANGI: Viloyatlardan Toshkentga (POST)
router.post('/add/to-tashkent', async (req, res) => {
  try {
    const regions = req.body.regions;
    if (!regions || (Array.isArray(regions) && regions.length === 0)) {
      return res.redirect('/routes/add/to-tashkent?error=' + encodeURIComponent('Viloyat tanlanmadi'));
    }

    const selectedRegions = Array.isArray(regions) ? regions : [regions];

    for (const region of selectedRegions) {
      const regionName = region.charAt(0).toUpperCase() + region.slice(1);
      await createRoute(
        `${regionName} → Toshkent`,
        region.toLowerCase(),
        'toshkent,toshkentga,тошкент',
        `Assalomu alaykum! ${regionName}dan Toshkentga yo'lovchi kerak.`,
        30
      );
    }

    res.redirect('/routes?success=' + encodeURIComponent(`${selectedRegions.length} ta yo'nalish qo'shildi`));
  } catch (error) {
    console.error('To Tashkent add error:', error);
    res.redirect('/routes/add/to-tashkent?error=' + encodeURIComponent(error.message));
  }
});

// Qo'shish (POST)
router.post('/add', async (req, res) => {
  try {
    const { name, from_keywords, to_keywords, sms_template, time_window_minutes } = req.body;

    await createRoute(
      name,
      from_keywords,
      to_keywords,
      sms_template,
      parseInt(time_window_minutes) || 30
    );

    res.redirect('/routes?success=added');
  } catch (error) {
    console.error('Route add error:', error);
    res.redirect('/routes/add?error=' + encodeURIComponent(error.message));
  }
});

// Tahrirlash sahifasi
router.get('/edit/:id', async (req, res) => {
  try {
    const route = await getRouteById(parseInt(req.params.id));

    if (!route) {
      return res.redirect('/routes?error=notfound');
    }

    res.render('routes/edit', {
      route,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Route edit page error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// Tahrirlash (POST)
router.post('/edit/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, from_keywords, to_keywords, sms_template, active, time_window_minutes } = req.body;

    await updateRoute(id, {
      name,
      from_keywords,
      to_keywords,
      sms_template,
      active: active === '1' || active === 'on',
      time_window_minutes: parseInt(time_window_minutes) || 30
    });

    res.redirect('/routes?success=updated');
  } catch (error) {
    console.error('Route update error:', error);
    res.redirect('/routes/edit/' + req.params.id + '?error=' + encodeURIComponent(error.message));
  }
});

// O'chirish
router.post('/delete/:id', async (req, res) => {
  try {
    await deleteRoute(parseInt(req.params.id));
    res.json({ success: true, message: 'Yo\'nalish o\'chirildi' });
  } catch (error) {
    console.error('Route delete error:', error);
    res.json({ success: false, error: error.message });
  }
});

// SMS yuborish sahifasi
router.get('/send/:id', async (req, res) => {
  try {
    const route = await getRouteById(parseInt(req.params.id));

    if (!route) {
      return res.redirect('/routes?error=notfound');
    }

    // Mos telefon raqamlarni topish (preview uchun)
    const matchedPhones = await findMatchingPhones(route.id, route.time_window_minutes);

    res.render('routes/send', {
      route,
      matchedPhones,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Route send page error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// SMS yuborish (POST) - QO'LDA YUBORISH (cooldown skip)
router.post('/send/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    // Qo'lda yuborilganda cooldown skip qilinadi
    const result = await sendRouteSMS(routeId, true); // skipCooldown = true

    if (result.success) {
      res.json({
        success: true,
        message: `✅ ${result.sentCount} ta SMS yuborildi!`,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        totalPhones: result.totalPhones
      });
    } else {
      res.json({
        success: false,
        error: result.error || 'SMS yuborishda xato'
      });
    }
  } catch (error) {
    console.error('Route send error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// E'lonlarni ko'rish sahifasi
router.get('/messages/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const route = await getRouteById(routeId);

    if (!route) {
      return res.redirect('/routes?error=notfound');
    }

    const messages = await getRouteMessages(routeId, 100);
    const messageCount = await getRouteMessageCount(routeId);

    res.render('routes/messages', {
      route,
      messages,
      messageCount,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Route messages error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});

// E'lon bo'yicha SMS yuborish (POST) - COOLDOWN YO'Q!
router.post('/messages/:messageId/send', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const message = await getRouteMessageById(messageId);

    if (!message) {
      return res.json({ success: false, error: 'E\'lon topilmadi' });
    }

    // SMS matni
    const smsText = message.sms_template || `Assalomu alaykum! ${message.route_name} yo'nalishi bo'yicha taklifimiz bor.`;

    // YO'NALISH BO'YICHA SMS - COOLDOWN YO'Q! (qo'lda yuborilganda)
    const result = await sendRouteSMSToPhones(message.route_id, message.phone_numbers, smsText, true); // skipCooldown = true

    // E'lonni yuborilgan deb belgilash
    if (result.success && result.sentCount > 0) {
      await markMessageAsSent(messageId);
    }

    res.json({
      success: result.success,
      message: result.success ? `✅ ${result.sentCount} ta SMS yuborildi!` : result.error,
      sentCount: result.sentCount,
      failedCount: result.failedCount
    });
  } catch (error) {
    console.error('Message send error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// YANGI: Bulk SMS yuborish (tanlangan raqamlarga)
router.post('/bulk-sms', async (req, res) => {
  try {
    const { phones, message, routeId } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.json({ success: false, error: 'Telefon raqamlar tanlanmadi' });
    }

    if (!message || message.trim().length === 0) {
      return res.json({ success: false, error: 'SMS matni kiritilmadi' });
    }

    // Agar routeId bo'lsa, yo'nalish SMS (cooldown yo'q - qo'lda yuborish)
    // Aks holda, oddiy SMS (cooldown bor)
    if (routeId) {
      // YO'NALISH BO'YICHA BULK SMS - COOLDOWN YO'Q! (qo'lda yuborish)
      const result = await sendRouteSMSToPhones(parseInt(routeId), phones, message, true); // skipCooldown = true

      res.json({
        success: result.success,
        message: result.success ? `SMS yuborish tugadi!` : result.error,
        sent: result.sentCount,
        failed: result.failedCount,
        total: phones.length
      });
    } else {
      // Oddiy bulk SMS - cooldown bor
      const { sendSMS } = require('../../services/smsService');
      let sentCount = 0;
      let failedCount = 0;

      for (const phone of phones) {
        try {
          const result = await sendSMS(phone, null, message, {});

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (smsError) {
          console.error(`Bulk SMS error for ${phone}:`, smsError);
          failedCount++;
        }

        // Har bir SMS orasida 1 soniya kutish (rate limit uchun)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      res.json({
        success: true,
        message: `SMS yuborish tugadi!`,
        sent: sentCount,
        failed: failedCount,
        total: phones.length
      });
    }
  } catch (error) {
    console.error('Bulk SMS error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Viloyat yo'nalishlarini o'chirish
router.delete('/delete-region/:regionName', async (req, res) => {
  try {
    const regionName = decodeURIComponent(req.params.regionName);
    const direction = req.query.direction || 'to-tashkent';

    const { query } = require('../../database/sqlite');

    let deletedCount = 0;

    if (direction === 'from-tashkent') {
      // Toshkentdan viloyatga: "Toshkent → Qashqadaryo (Tuman)" formatidagi barcha yo'nalishlarni o'chirish
      const routes = await query(
        `SELECT id, name FROM routes
         WHERE name LIKE ? AND active = 1`,
        [`Toshkent → ${regionName}%`]
      );

      for (const route of routes) {
        await query('UPDATE routes SET active = 0 WHERE id = ?', [route.id]);
        deletedCount++;
      }
    } else {
      // Viloyatdan Toshkentga: "Qashqadaryo (Tuman) → Toshkent" formatidagi barcha yo'nalishlarni o'chirish
      const routes = await query(
        `SELECT id, name FROM routes
         WHERE name LIKE ? AND active = 1`,
        [`${regionName}%→ Toshkent`]
      );

      for (const route of routes) {
        await query('UPDATE routes SET active = 0 WHERE id = ?', [route.id]);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `${regionName} viloyatining ${deletedCount} ta yo'nalishi o'chirildi`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Delete region error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;