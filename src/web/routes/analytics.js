const express = require('express');
const router = express.Router();
const { query } = require('../../database/sqlite');

// Main Analytics Dashboard
router.get('/', async (req, res) => {
  try {
    const period = req.query.period || '7'; // days
    const periodDays = parseInt(period);

    // 1. UMUMIY STATISTIKA
    const overview = await query(`
      SELECT
        COUNT(DISTINCT p.phone) as total_unique_phones,
        COUNT(*) as total_phone_records,
        SUM(p.repeat_count) as total_appearances,
        COUNT(DISTINCT p.group_id) as active_groups,
        (SELECT COUNT(*) FROM sms_logs WHERE status = 'success') as total_sms_sent,
        (SELECT COUNT(*) FROM sms_logs WHERE status = 'failed') as total_sms_failed
      FROM phones p
    `);

    // 2. KUNLIK TREND (oxirgi N kun)
    const dailyTrend = await query(`
      SELECT
        DATE(first_date) as date,
        COUNT(DISTINCT phone) as new_phones,
        SUM(repeat_count) as appearances
      FROM phones
      WHERE DATE(first_date) >= DATE('now', '-${periodDays} days')
      GROUP BY DATE(first_date)
      ORDER BY date ASC
    `);

    // 3. SOATLIK FAOLLIK (Peak Hours)
    const hourlyActivity = await query(`
      SELECT
        CAST(strftime('%H', first_date) AS INTEGER) as hour,
        COUNT(*) as count
      FROM phones
      WHERE DATE(first_date) >= DATE('now', '-${periodDays} days')
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // 4. BARCHA GURUHLAR STATISTIKA
    const allGroups = await query(`
      SELECT
        g.id,
        g.name,
        COUNT(DISTINCT p.phone) as unique_phones,
        COUNT(*) as total_records,
        SUM(p.repeat_count) as total_appearances,
        (SELECT COUNT(DISTINCT phone) FROM phones WHERE group_id = g.id AND DATE(first_date) = DATE('now')) as today_phones,
        (SELECT COUNT(*) FROM phones WHERE group_id = g.id AND DATE(first_date) = DATE('now')) as today_messages,
        (SELECT COUNT(*) FROM sms_logs WHERE group_id = g.id AND status = 'success') as sms_sent,
        (SELECT COUNT(*) FROM sms_logs WHERE group_id = g.id AND status = 'cooldown') as sms_cooldown,
        (SELECT COUNT(*) FROM sms_logs WHERE group_id = g.id AND status = 'failed') as sms_failed,
        (SELECT COUNT(*) FROM sms_logs WHERE group_id = g.id) as sms_total
      FROM groups g
      LEFT JOIN phones p ON g.id = p.group_id
      WHERE DATE(p.first_date) >= DATE('now', '-${periodDays} days')
      GROUP BY g.id, g.name
      ORDER BY total_appearances DESC
    `);

    // 5. SMS STATISTIKA (Status bo'yicha)
    const smsConversion = await query(`
      SELECT
        DATE(sent_at) as date,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'cooldown' THEN 1 ELSE 0 END) as cooldown,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        COUNT(*) as total
      FROM sms_logs
      WHERE DATE(sent_at) >= DATE('now', '-${periodDays} days')
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `);

    // 6. TOP TAKRORLANGAN RAQAMLAR
    const topRepeatedPhones = await query(`
      SELECT
        p.phone,
        g.name as group_name,
        p.repeat_count,
        p.first_date,
        p.last_date
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      ORDER BY p.repeat_count DESC
      LIMIT 10
    `);

    // 7. HAFTALIK SMS STATISTIKA
    const weeklySmsStats = await query(`
      SELECT
        strftime('%w', sent_at) as day_of_week,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'cooldown' THEN 1 ELSE 0 END) as cooldown,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM sms_logs
      WHERE DATE(sent_at) >= DATE('now', '-7 days')
      GROUP BY day_of_week
      ORDER BY day_of_week
    `);

    // 8. TAKRORLANISH TAQSIMOTI
    const repeatDistribution = await query(`
      SELECT
        CASE
          WHEN repeat_count = 1 THEN '1 marta'
          WHEN repeat_count BETWEEN 2 AND 5 THEN '2-5 marta'
          WHEN repeat_count BETWEEN 6 AND 10 THEN '6-10 marta'
          WHEN repeat_count BETWEEN 11 AND 50 THEN '11-50 marta'
          WHEN repeat_count BETWEEN 51 AND 100 THEN '51-100 marta'
          ELSE '100+ marta'
        END as range_label,
        COUNT(*) as count
      FROM phones
      GROUP BY range_label
      ORDER BY MIN(repeat_count)
    `);

    // 9. SOATLIK SMS STATISTIKA (bugun 24 soat)
    const hourlySmsActivity = await query(`
      SELECT
        CAST(strftime('%H', sent_at) AS INTEGER) as hour,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'cooldown' THEN 1 ELSE 0 END) as cooldown,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM sms_logs
      WHERE DATE(sent_at) = DATE('now')
      GROUP BY hour
      ORDER BY hour ASC
    `);

    // 10. KUNLIK SMS KALENDAR (oxirgi 30 kun)
    const dailySmsCalendar = await query(`
      SELECT
        DATE(sent_at) as date,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'cooldown' THEN 1 ELSE 0 END) as cooldown,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM sms_logs
      WHERE DATE(sent_at) >= DATE('now', '-30 days')
      GROUP BY DATE(sent_at)
      ORDER BY date ASC
    `);

    // 11. REAL-TIME SMS MONITOR (oxirgi 10 daqiqa)
    const realtimeSms = await query(`
      SELECT
        to_phone,
        g.name as group_name,
        status,
        sent_at,
        message
      FROM sms_logs
      LEFT JOIN groups g ON sms_logs.group_id = g.id
      WHERE datetime(sent_at) >= datetime('now', '-10 minutes')
      ORDER BY sent_at DESC
      LIMIT 20
    `);

    // 12. GURUHLAR BO'YICHA SMS TOP (top 10 groups by SMS count)
    const routesSmsStats = await query(`
      SELECT
        g.id,
        g.name,
        CASE
          WHEN g.name LIKE '%→%' THEN
            TRIM(SUBSTR(g.name, 1, INSTR(g.name, '→') - 1))
          ELSE 'N/A'
        END as from_region,
        CASE
          WHEN g.name LIKE '%→%' THEN
            TRIM(SUBSTR(g.name, INSTR(g.name, '→') + 1))
          ELSE g.name
        END as to_region,
        COUNT(sms.id) as sms_count,
        SUM(CASE WHEN sms.status = 'success' THEN 1 ELSE 0 END) as sms_success,
        SUM(CASE WHEN sms.status = 'cooldown' THEN 1 ELSE 0 END) as sms_cooldown,
        SUM(CASE WHEN sms.status = 'failed' THEN 1 ELSE 0 END) as sms_failed
      FROM groups g
      LEFT JOIN sms_logs sms ON g.id = sms.group_id
      WHERE sms.id IS NOT NULL
      GROUP BY g.id, g.name
      ORDER BY sms_count DESC
      LIMIT 10
    `);

    res.render('analytics/dashboard', {
      username: req.session.username,
      period: periodDays,
      overview: overview[0],
      dailyTrend,
      hourlyActivity,
      allGroups,
      smsConversion,
      topRepeatedPhones,
      weeklySmsStats,
      repeatDistribution,
      hourlySmsActivity,
      dailySmsCalendar,
      realtimeSms,
      routesSmsStats
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// API endpoint for real-time updates
router.get('/api/live-stats', async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM phones WHERE DATE(first_date) = DATE('now')) as today_phones,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now') AND status = 'success') as today_sms_sent,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now') AND status = 'cooldown') as today_sms_cooldown,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now') AND status = 'pending') as today_sms_pending,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now') AND status = 'failed') as today_sms_failed,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now')) as today_sms_total,
        (SELECT COUNT(*) FROM phones WHERE DATE(first_date) = DATE('now', '-1 day')) as yesterday_phones,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now', '-1 day') AND status = 'success') as yesterday_sms_sent
    `);

    // Calculate growth rates
    const phoneGrowth = stats[0].yesterday_phones > 0
      ? ((stats[0].today_phones - stats[0].yesterday_phones) / stats[0].yesterday_phones * 100).toFixed(1)
      : 0;

    const smsGrowth = stats[0].yesterday_sms_sent > 0
      ? ((stats[0].today_sms_sent - stats[0].yesterday_sms_sent) / stats[0].yesterday_sms_sent * 100).toFixed(1)
      : 0;

    res.json({
      ...stats[0],
      phoneGrowth: parseFloat(phoneGrowth),
      smsGrowth: parseFloat(smsGrowth)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for geographic distribution
router.get('/api/geographic', async (req, res) => {
  try {
    // Extract region from group name
    const geoData = await query(`
      SELECT
        CASE
          WHEN g.name LIKE '%Toshkent%' THEN 'Toshkent'
          WHEN g.name LIKE '%Qashqadaryo%' OR g.name LIKE '%Qarshi%' OR g.name LIKE '%Shahrisabz%'
            OR g.name LIKE '%Yakkabog%' OR g.name LIKE '%Koson%' OR g.name LIKE '%Kitob%'
            OR g.name LIKE '%Chiroqchi%' OR g.name LIKE '%Guzor%' OR g.name LIKE '%G''uzor%'
            OR g.name LIKE '%Mirishkor%' OR g.name LIKE '%Dehqonobod%' THEN 'Qashqadaryo'
          WHEN g.name LIKE '%Samarqand%' THEN 'Samarqand'
          WHEN g.name LIKE '%Buxoro%' OR g.name LIKE '%Bukhara%' THEN 'Buxoro'
          WHEN g.name LIKE '%Andijon%' OR g.name LIKE '%Andijan%' THEN 'Andijon'
          WHEN g.name LIKE '%Farg''ona%' OR g.name LIKE '%Fergana%' THEN 'Farg''ona'
          WHEN g.name LIKE '%Namangan%' THEN 'Namangan'
          WHEN g.name LIKE '%Sirdaryo%' THEN 'Sirdaryo'
          WHEN g.name LIKE '%Jizzax%' OR g.name LIKE '%Jizzakh%' THEN 'Jizzax'
          WHEN g.name LIKE '%Xorazm%' OR g.name LIKE '%Khorezm%' THEN 'Xorazm'
          WHEN g.name LIKE '%Navoiy%' THEN 'Navoiy'
          WHEN g.name LIKE '%Qoraqalpog''iston%' OR g.name LIKE '%Karakalpak%' THEN 'Qoraqalpog''iston'
          WHEN g.name LIKE '%Surxondaryo%' OR g.name LIKE '%Surkhan%' THEN 'Surxondaryo'
          ELSE 'Boshqa'
        END as region,
        COUNT(DISTINCT p.phone) as phone_count,
        COUNT(*) as total_records
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      GROUP BY region
      ORDER BY phone_count DESC
    `);

    res.json(geoData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for calendar heatmap data
router.get('/api/heatmap', async (req, res) => {
  try {
    // Last 90 days activity
    const heatmapData = await query(`
      SELECT
        DATE(first_date) as date,
        COUNT(DISTINCT phone) as count
      FROM phones
      WHERE DATE(first_date) >= DATE('now', '-90 days')
      GROUP BY DATE(first_date)
      ORDER BY date ASC
    `);

    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
