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

    // 4. ENG FAOL GURUHLAR (Top 10)
    const topGroups = await query(`
      SELECT
        g.name,
        COUNT(DISTINCT p.phone) as unique_phones,
        COUNT(*) as total_records,
        SUM(p.repeat_count) as total_appearances
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE DATE(p.first_date) >= DATE('now', '-${periodDays} days')
      GROUP BY g.id, g.name
      ORDER BY total_appearances DESC
      LIMIT 10
    `);

    // 5. SMS CONVERSION RATE (Haftalik)
    const smsConversion = await query(`
      SELECT
        DATE(sent_at) as date,
        COUNT(*) as total_sent,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        ROUND(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as success_rate
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
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success
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

    res.render('analytics/dashboard', {
      username: req.session.username,
      period: periodDays,
      overview: overview[0],
      dailyTrend,
      hourlyActivity,
      topGroups,
      smsConversion,
      topRepeatedPhones,
      weeklySmsStats,
      repeatDistribution
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
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now')) as today_sms,
        (SELECT COUNT(*) FROM sms_logs WHERE DATE(sent_at) = DATE('now') AND status = 'success') as today_sms_success
    `);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
