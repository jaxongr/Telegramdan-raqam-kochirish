const express = require('express');
const router = express.Router();
const { getSMSLogs, getAllGroups } = require('../../database/models');
const { getRouteSMSLogs, getAllRoutes } = require('../../database/routes');
const { query } = require('../../database/sqlite');

// Monitoring SMS loglar (oddiy)
router.get('/', async (req, res) => {
  try {
    const filters = {
      group_id: req.query.group_id,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50
    };

    const logs = await getSMSLogs(filters);
    const groups = await getAllGroups();

    res.render('sms/logs', {
      logs,
      groups,
      filters,
      username: req.session.username
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Yo'nalish SMS loglar
router.get('/routes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const routeId = req.query.route_id ? parseInt(req.query.route_id) : null;
    const status = req.query.status || null;

    // Route SMS logs with route names
    let logs;
    if (routeId && status) {
      logs = await query(
        `SELECT rsl.*, r.name as route_name
         FROM route_sms_logs rsl
         JOIN routes r ON rsl.route_id = r.id
         WHERE rsl.route_id = ? AND rsl.status = ?
         ORDER BY rsl.sent_at DESC
         LIMIT ?`,
        [routeId, status, limit]
      );
    } else if (routeId) {
      logs = await query(
        `SELECT rsl.*, r.name as route_name
         FROM route_sms_logs rsl
         JOIN routes r ON rsl.route_id = r.id
         WHERE rsl.route_id = ?
         ORDER BY rsl.sent_at DESC
         LIMIT ?`,
        [routeId, limit]
      );
    } else if (status) {
      logs = await query(
        `SELECT rsl.*, r.name as route_name
         FROM route_sms_logs rsl
         JOIN routes r ON rsl.route_id = r.id
         WHERE rsl.status = ?
         ORDER BY rsl.sent_at DESC
         LIMIT ?`,
        [status, limit]
      );
    } else {
      logs = await query(
        `SELECT rsl.*, r.name as route_name
         FROM route_sms_logs rsl
         JOIN routes r ON rsl.route_id = r.id
         ORDER BY rsl.sent_at DESC
         LIMIT ?`,
        [limit]
      );
    }

    // UTC timezone marker qo'shish
    logs.forEach(log => {
      if (log.sent_at && !log.sent_at.endsWith('Z')) {
        log.sent_at = log.sent_at + 'Z';
      }
    });

    const routes = await getAllRoutes();

    // Statistics
    const statsQuery = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM route_sms_logs
    `);
    const stats = statsQuery[0];

    res.render('sms/route_logs', {
      logs,
      routes,
      stats,
      filters: {
        route_id: routeId,
        status: status,
        limit: limit
      },
      username: req.session.username
    });
  } catch (error) {
    console.error('Route SMS logs error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

module.exports = router;
