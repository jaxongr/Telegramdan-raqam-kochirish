const express = require('express');
const router = express.Router();
const { getSMSLogs, getAllGroups } = require('../../database/models');
const { getRouteSMSLogs, getAllRoutes } = require('../../database/routes');
const { query } = require('../../database/sqlite');

// Monitoring SMS loglar (oddiy)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status || null;
    const phone = req.query.phone || null;
    const groupId = req.query.group_id || null;

    // Build query
    let whereConditions = [];
    let params = [];

    if (status) {
      whereConditions.push('sms_logs.status = ?');
      params.push(status);
    }
    if (phone) {
      whereConditions.push('sms_logs.to_phone LIKE ?');
      params.push(`%${phone}%`);
    }
    if (groupId) {
      whereConditions.push('sms_logs.group_id = ?');
      params.push(parseInt(groupId));
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM sms_logs ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Get logs with pagination and calculate cooldown time in SQL
    const logsQuery = `
      SELECT
        sms_logs.*,
        groups.name as group_name,
        CASE
          WHEN sms_logs.status = 'cooldown' THEN
            MAX(0, 300 - CAST((julianday('now') - julianday(sms_logs.sent_at)) * 24 * 60 AS INTEGER))
          ELSE NULL
        END as remaining_minutes
      FROM sms_logs
      LEFT JOIN groups ON sms_logs.group_id = groups.id
      ${whereClause}
      ORDER BY sms_logs.sent_at DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await query(logsQuery, [...params, limit, offset]);

    // UTC timezone marker
    logs.forEach(log => {
      if (log.sent_at && !log.sent_at.endsWith('Z')) {
        log.sent_at = log.sent_at + 'Z';
      }
    });

    const groups = await getAllGroups();

    // Statistics
    const statsQuery = await query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'cooldown' THEN 1 ELSE 0 END) as cooldown,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM sms_logs
      ${whereClause}
    `, params);

    res.render('sms/logs', {
      logs,
      groups,
      stats: statsQuery[0],
      filters: {
        status,
        phone,
        group_id: groupId,
        limit
      },
      pagination: {
        page,
        limit,
        total,
        totalPages
      },
      username: req.session.username
    });
  } catch (error) {
    console.error('SMS logs error:', error);
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
