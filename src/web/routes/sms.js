const express = require('express');
const router = express.Router();
const { getSMSLogs, getAllGroups } = require('../../database/models');

// SMS loglar
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

module.exports = router;
