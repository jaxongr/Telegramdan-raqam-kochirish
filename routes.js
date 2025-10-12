const express = require('express');
const router = express.Router();
const { getAllRoutes, getRouteById, createRoute, updateRoute, deleteRoute, findMatchingPhones, getRouteStatistics, findMatchingMessages } = require('../../database/routes');
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
      currentPage: "routes",
      username: req.session.username
    });
  } catch (error) {
    console.error('Routes list error:', error);
    res.status(500).send('Xatolik yuz berdi');
  }
});

// Qo'shish sahifasi
router.get('/add', (req, res) => {
  res.render('routes/add', { currentPage: "routes", username: req.session.username });
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
      currentPage: "routes",
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
router.get('/preview/:id', async (req, res) => {
  try {
    const route = await getRouteById(parseInt(req.params.id));
    if (!route) {
      return res.redirect('/routes?error=notfound');
    }

    // Viloyat route - tuman bo'yicha
    if (route.use_region_matching && route.from_region) {
      const { findMessagesByDistricts } = require('../../database/routes_with_districts');
      // Faqat oxirgi 30 daqiqa (yoki route sozlamasidagi vaqt)
      const districts = await findMessagesByDistricts(route.id, route.time_window_minutes);
      
      return res.render('routes/preview', {
        route,
        matchedMessages: [], // Compatibility
        districts: districts || [],
        isDistrictView: true,
        currentPage: "routes",
        username: req.session.username
      });
    }

    // Oddiy route
    const matchedMessages = await findMatchingMessages(route.id, route.time_window_minutes);
    res.render('routes/preview', {
      route,
      matchedMessages,
      districts: [],
      isDistrictView: false,
      currentPage: "routes",
      username: req.session.username
    });
  } catch (error) {
    console.error('Route preview error:', error);
    res.redirect('/routes?error=' + encodeURIComponent(error.message));
  }
});
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
      currentPage: "routes",
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


// ====================================
// HIERARCHICAL NAVIGATION: Regions → Districts → Phones
// ====================================

// Level 1: Regions List
router.get('/regions', async (req, res) => {
  try {
    const routes = await getAllRoutes();
    const { findMessagesByDistricts } = require('../../database/routes_with_districts');
    
    // Faqat region-based routelarni olish
    const regionRoutes = routes.filter(r => r.use_region_matching && r.from_region && r.active);
    
    // Har bir region uchun telefon sonini hisoblash
    const regionsWithStats = await Promise.all(
      regionRoutes.map(async (route) => {
        const districts = await findMessagesByDistricts(route.id, route.time_window_minutes);
        const phoneCount = districts ? districts.reduce((sum, d) => sum + d.phone_count, 0) : 0;
        
        return {
          id: route.id,
          name: route.name,
          from_region: route.from_region,
          to_region: route.to_region,
          phone_count: phoneCount,
          district_count: districts ? districts.length : 0
        };
      })
    );
    
    res.render('routes/region_list', {
      regions: regionsWithStats,
      currentPage: "routes",
      username: req.session.username
    });
  } catch (error) {
    console.error('Regions list error:', error);
    res.status(500).send('Xatolik yuz berdi: ' + error.message);
  }
});

// Level 2: Region Detail (Districts in Region)
router.get('/region/:id', async (req, res) => {
  try {
    const route = await getRouteById(parseInt(req.params.id));
    
    if (!route) {
      return res.redirect('/routes/regions?error=notfound');
    }
    
    if (!route.use_region_matching || !route.from_region) {
      return res.redirect('/routes/preview/' + route.id);
    }
    
    const { findMessagesByDistricts } = require('../../database/routes_with_districts');
    const districts = await findMessagesByDistricts(route.id, route.time_window_minutes);
    
    const totalPhones = districts ? districts.reduce((sum, d) => sum + d.phone_count, 0) : 0;
    const districtCount = districts ? districts.length : 0;
    const totalMessages = totalPhones; // Each phone represents one message
    
    res.render('routes/region_detail', {
      route,
      districts: districts || [],
      totalPhones,
      districtCount,
      totalMessages,
      currentPage: "routes",
      username: req.session.username
    });
  } catch (error) {
    console.error('Region detail error:', error);
    res.redirect('/routes/regions?error=' + encodeURIComponent(error.message));
  }
});

// Level 3: District Detail (Phones in District)
router.get('/district/:routeId/:districtName', async (req, res) => {
  try {
    const route = await getRouteById(parseInt(req.params.routeId));
    const districtName = decodeURIComponent(req.params.districtName);
    
    if (!route) {
      return res.redirect('/routes/regions?error=notfound');
    }
    
    const { findMessagesByDistricts } = require('../../database/routes_with_districts');
    const districts = await findMessagesByDistricts(route.id, route.time_window_minutes);
    
    const district = districts ? districts.find(d => d.district_name === districtName) : null;
    
    if (!district) {
      return res.redirect('/routes/region/' + route.id + '?error=district_notfound');
    }
    
    res.render('routes/district_detail', {
      route,
      districtName,
      phones: district.phones || [],
      currentPage: "routes",
      username: req.session.username
    });
  } catch (error) {
    console.error('District detail error:', error);
    res.redirect('/routes/region/' + req.params.routeId + '?error=' + encodeURIComponent(error.message));
  }
});

// SMS yuborish tanlangan telefonlarga
router.post('/send-to-phones', async (req, res) => {
  try {
    const { route_id, phones, message } = req.body;
    
    if (!route_id || !phones || phones.length === 0) {
      return res.json({
        success: false,
        error: 'Route ID va telefon raqamlar kerak'
      });
    }
    
    const route = await getRouteById(parseInt(route_id));
    if (!route) {
      return res.json({
        success: false,
        error: 'Route topilmadi'
      });
    }
    
    const { sendSMS } = require('../../services/smsService');
    const { getSMSCountToday } = require('../../database/models');
    
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (const phone of phones) {
      try {
        // Bugungi SMS limitni tekshirish
        const todayCount = await getSMSCountToday(phone);
        if (todayCount >= 3) {
          failedCount++;
          errors.push({ phone, error: 'Bugun 3 ta SMS yuborilgan (limit)' });
          continue;
        }
        
        // SMS yuborish
        const templateVars = { phone };
        const result = await sendSMS(phone, route.id, message || route.sms_template, templateVars);
        
        if (result.success) {
          sentCount++;
        } else {
          failedCount++;
          errors.push({ phone, error: result.error });
        }
      } catch (error) {
        failedCount++;
        errors.push({ phone, error: error.message });
      }
    }
    
    res.json({
      success: sentCount > 0,
      sent: sentCount,
      failed: failedCount,
      errors: errors.slice(0, 5) // Faqat birinchi 5 ta xato
    });
    
  } catch (error) {
    console.error('Send to phones error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
