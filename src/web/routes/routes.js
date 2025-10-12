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
const { sendRouteSMS } = require('../../services/routeSmsService');

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

// YANGI: Toshkentdan viloyatlarga (GET) - Yo'nalishlar ro'yxati
router.get('/add/from-tashkent', async (req, res) => {
  try {
    const allRoutes = await getAllRoutes();
    // Faqat Toshkentdan boshlanuvchi yo'nalishlar
    const fromTashkentRoutes = allRoutes.filter(route =>
      route.from_keywords && route.from_keywords.toLowerCase().includes('toshkent')
    );

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

// YANGI: Viloyatlardan Toshkentga (GET) - Yo'nalishlar ro'yxati
router.get('/add/to-tashkent', async (req, res) => {
  try {
    const allRoutes = await getAllRoutes();
    // Faqat Toshkentga ketuvchi yo'nalishlar
    const toTashkentRoutes = allRoutes.filter(route =>
      route.to_keywords && route.to_keywords.toLowerCase().includes('toshkent')
    );

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

// SMS yuborish (POST)
router.post('/send/:id', async (req, res) => {
  try {
    const routeId = parseInt(req.params.id);
    const result = await sendRouteSMS(routeId);

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

// E'lon bo'yicha SMS yuborish (POST)
router.post('/messages/:messageId/send', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const message = await getRouteMessageById(messageId);

    if (!message) {
      return res.json({ success: false, error: 'E\'lon topilmadi' });
    }

    // SMS yuborish
    const { sendSMS } = require('../../services/smsService');
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of message.phone_numbers) {
      try {
        const smsText = message.sms_template || `Assalomu alaykum! ${message.route_name} yo'nalishi bo'yicha taklifimiz bor.`;
        const result = await sendSMS(phone, message.group_id, smsText, {});

        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (smsError) {
        console.error(`SMS error for ${phone}:`, smsError);
        failedCount++;
      }
    }

    // E'lonni yuborilgan deb belgilash
    await markMessageAsSent(messageId);

    res.json({
      success: true,
      message: `✅ ${sentCount} ta SMS yuborildi!`,
      sentCount,
      failedCount
    });
  } catch (error) {
    console.error('Message send error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;