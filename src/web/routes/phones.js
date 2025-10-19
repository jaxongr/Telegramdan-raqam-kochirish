const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAllPhones, getAllGroups, markPhoneAsLifetimeUnique, getGroupById } = require('../../database/models');
const { query } = require('../../database/sqlite');
const { Parser } = require('json2csv');

// Ro'yxat with PAGINATION
router.get('/', async (req, res) => {
  try {
    // Pagination settings
    const page = parseInt(req.query.page) || 1;
    const limit = 100; // Show 100 phones per page
    const offset = (page - 1) * limit;

    // Filters
    const filters = {
      group_id: req.query.group_id,
      lifetime_unique: req.query.lifetime_unique === 'true'
    };

    // Build WHERE clause
    let whereConditions = ['1=1'];
    let params = [];

    if (filters.group_id) {
      whereConditions.push('p.group_id = ?');
      params.push(filters.group_id);
    }

    if (filters.lifetime_unique) {
      whereConditions.push('p.lifetime_unique = 1');
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(`
      SELECT COUNT(*) as total
      FROM phones p
      WHERE ${whereClause}
    `, params);
    const totalCount = countResult[0].total;
    const totalPages = Math.ceil(totalCount / limit);

    // Get paginated phones
    const phones = await query(`
      SELECT
        p.*,
        g.name as group_name
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE ${whereClause}
      ORDER BY p.last_date DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const groups = await getAllGroups();

    res.render('phones/list', {
      phones,
      groups,
      filters,
      username: req.session.username,
      pagination: {
        page,
        totalPages,
        totalCount,
        limit,
        hasPrev: page > 1,
        hasNext: page < totalPages,
        prevPage: page - 1,
        nextPage: page + 1
      }
    });
  } catch (error) {
    console.error('Phones page error:', error);
    res.status(500).render('error', { error: error.message });
  }
});

// Umrbod unikal qilish
router.post('/mark-unique/:id', async (req, res) => {
  try {
    await markPhoneAsLifetimeUnique(req.params.id);
    const page = req.query.page || 1;
    res.redirect(`/phones?page=${page}`);
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// CSV export (all data)
router.get('/export', async (req, res) => {
  try {
    // For export, get all phones (no pagination)
    const phones = await getAllPhones({});

    const fields = ['phone', 'group_name', 'first_date', 'last_date', 'repeat_count', 'lifetime_unique'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(phones);

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename=phones.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// TXT export (group specific)
router.get('/export-txt', async (req, res) => {
  try {
    const groupId = req.query.group_id;

    // Build WHERE clause
    let whereClause = '1=1';
    let params = [];

    if (groupId) {
      whereClause = 'p.group_id = ?';
      params.push(groupId);
    }

    // Get phones with group info
    const phones = await query(`
      SELECT
        p.phone,
        g.name as group_name
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE ${whereClause}
      ORDER BY p.last_date DESC
    `, params);

    // Generate TXT content (one phone per line)
    const txtContent = phones.map(p => p.phone).join('\n');

    // Generate filename
    const groupName = groupId ? phones[0]?.group_name || 'unknown' : 'all';
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.txt`;

    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(txtContent);
  } catch (error) {
    console.error('TXT export error:', error);
    res.status(500).send('Export xatosi: ' + error.message);
  }
});

// Save to file on server
router.post('/save-to-file', async (req, res) => {
  try {
    const groupId = req.body.group_id;

    // Build WHERE clause
    let whereClause = '1=1';
    let params = [];

    if (groupId) {
      whereClause = 'p.group_id = ?';
      params.push(groupId);
    }

    // Get phones with group info
    const phones = await query(`
      SELECT
        p.phone,
        g.name as group_name
      FROM phones p
      LEFT JOIN groups g ON p.group_id = g.id
      WHERE ${whereClause}
      ORDER BY p.last_date DESC
    `, params);

    // Generate file content
    const content = phones.map(p => p.phone).join('\n');

    // Generate filename
    const groupName = groupId ? phones[0]?.group_name || 'unknown' : 'all';
    const date = new Date().toISOString().split('T')[0];
    const fileName = `phones_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.txt`;

    // Ensure exports directory exists
    const exportsDir = path.join(__dirname, '../../../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(exportsDir, fileName);
    fs.writeFileSync(filePath, content, 'utf8');

    res.json({
      success: true,
      message: `${phones.length} ta telefon raqam saqlandi!`,
      fileName: fileName,
      filePath: filePath
    });
  } catch (error) {
    console.error('Save to file error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
