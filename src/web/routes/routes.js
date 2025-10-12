const express = require('express');
const router = express.Router();
const {
  getAllRoutes,
  getRouteById,
  createRoute,
  updateRoute,
  deleteRoute,
  findMatchingPhones,
  getRouteStatistics
} = require('../../database/routes');
const { sendRouteSMS } = require('../../services/routeSmsService');

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const routes = await getAllRoutes();

    // Har bir route uchun statistika
    const routesWithStats = await Promise.all(
      routes.map(async (route) => {
        const stats = await getRouteStatistics(route.id);
        return {
          ...route,
          totalSent: stats.total,
          successSent: stats.success
        };
      })
    );

    res.render('routes/list', {
      routes: routesWithStats,
      page: 'routes',
      username: req.session.username
    });
  } catch (error) {
    console.error('Routes list error:', error);
    res.status(500).send('Xatolik yuz berdi');
  }
});

// Qo'shish sahifasi
router.get('/add', (req, res) => {
  res.render('routes/add', { page: 'routes', username: req.session.username });
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
    res.redirect('/routes?success=deleted');
  } catch (error) {
    console.error('Route delete error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
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

module.exports = router;