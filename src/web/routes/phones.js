const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getAllPhones, getAllGroups, markPhoneAsLifetimeUnique, getGroupById } = require('../../database/models');
const { Parser } = require('json2csv');

// Ro'yxat
router.get('/', async (req, res) => {
  try {
    const filters = {
      group_id: req.query.group_id,
      lifetime_unique: req.query.lifetime_unique === 'true'
    };

    const phones = await getAllPhones(filters);
    const groups = await getAllGroups();

    res.render('phones/list', {
      phones,
      groups,
      filters,
      username: req.session.username
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Umrbod unikal qilish
router.post('/mark-unique/:id', async (req, res) => {
  try {
    await markPhoneAsLifetimeUnique(req.params.id);
    res.redirect('/phones');
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// CSV export
router.get('/export', async (req, res) => {
  try {
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

// TXT export (guruh bo'yicha)
router.get('/export-txt', async (req, res) => {
  try {
    const groupId = req.query.group_id;
    const filters = groupId ? { group_id: groupId } : {};

    const phones = await getAllPhones(filters);

    // Fayl nomi yaratish
    let fileName = 'telefon_raqamlar';
    if (groupId) {
      const group = await getGroupById(groupId);
      if (group) {
        const groupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
        const date = new Date().toISOString().split('T')[0];
        fileName = `${groupName}_${date}`;
      }
    } else {
      const date = new Date().toISOString().split('T')[0];
      fileName = `barcha_raqamlar_${date}`;
    }

    // Telefon raqamlarni matnda formatlash (har birini yangi qatorda)
    const txtContent = phones.map(p => p.phone).join('\n');

    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename=${fileName}.txt`);
    res.send(txtContent);
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Faylga saqlash (serverda)
router.post('/save-to-file', async (req, res) => {
  try {
    const groupId = req.body.group_id;
    const filters = groupId ? { group_id: groupId } : {};

    const phones = await getAllPhones(filters);

    // Exports papkasini yaratish
    const exportsDir = path.join(__dirname, '../../../exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // Fayl nomi
    let fileName = 'telefon_raqamlar';
    if (groupId) {
      const group = await getGroupById(groupId);
      if (group) {
        const groupName = group.name.replace(/[^a-zA-Z0-9]/g, '_');
        const date = new Date().toISOString().split('T')[0];
        fileName = `${groupName}_${date}`;
      }
    } else {
      const date = new Date().toISOString().split('T')[0];
      fileName = `barcha_raqamlar_${date}`;
    }

    const filePath = path.join(exportsDir, `${fileName}.txt`);

    // Faylga yozish
    const txtContent = phones.map(p => p.phone).join('\n');
    fs.writeFileSync(filePath, txtContent, 'utf8');

    res.json({
      success: true,
      message: `${phones.length} ta raqam saqlandi`,
      filePath: filePath,
      fileName: `${fileName}.txt`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
