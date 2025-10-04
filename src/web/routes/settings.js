const express = require('express');
const router = express.Router();
const { getSetting, setSetting } = require('../../database/models');
const fs = require('fs').promises;
const path = require('path');

// Sozlamalar
router.get('/', async (req, res) => {
  try {
    const settings = {
      telegram_api_id: process.env.TELEGRAM_API_ID || '',
      telegram_api_hash: process.env.TELEGRAM_API_HASH || '',
      semysms_api_key: process.env.SEMYSMS_API_KEY || '',
      daily_limit: process.env.SMS_DAILY_LIMIT_PER_NUMBER || 2,
      sms_delay: process.env.SMS_DELAY_SECONDS || 1
    };

    res.render('settings/index', {
      settings,
      error: null,
      success: null,
      username: req.session.username
    });
  } catch (error) {
    res.status(500).render('error', { error: error.message });
  }
});

// Saqlash
router.post('/', async (req, res) => {
  try {
    const {
      telegram_api_id,
      telegram_api_hash,
      semysms_api_key,
      daily_limit,
      sms_delay
    } = req.body;

    // .env faylni yangilash
    const envPath = path.join(__dirname, '../../../.env');
    let envContent = await fs.readFile(envPath, 'utf8');

    envContent = updateEnvVariable(envContent, 'TELEGRAM_API_ID', telegram_api_id);
    envContent = updateEnvVariable(envContent, 'TELEGRAM_API_HASH', telegram_api_hash);
    envContent = updateEnvVariable(envContent, 'SEMYSMS_API_KEY', semysms_api_key);
    envContent = updateEnvVariable(envContent, 'SMS_DAILY_LIMIT_PER_NUMBER', daily_limit);
    envContent = updateEnvVariable(envContent, 'SMS_DELAY_SECONDS', sms_delay);

    await fs.writeFile(envPath, envContent);

    res.render('settings/index', {
      settings: req.body,
      error: null,
      success: 'Sozlamalar saqlandi. Qayta ishga tushirish kerak.',
      username: req.session.username
    });
  } catch (error) {
    res.render('settings/index', {
      settings: req.body,
      error: error.message,
      success: null,
      username: req.session.username
    });
  }
});

function updateEnvVariable(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

module.exports = router;
