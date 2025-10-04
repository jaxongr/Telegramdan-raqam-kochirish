const { query } = require('./src/database/index');

async function addSMSColumn() {
  try {
    // SQLite uchun
    await query('ALTER TABLE groups ADD COLUMN sms_enabled INTEGER DEFAULT 0');
    console.log('✅ sms_enabled ustuni qo\'shildi!');
  } catch (error) {
    if (error.message.includes('duplicate column')) {
      console.log('✓ sms_enabled ustuni allaqachon mavjud');
    } else {
      console.error('❌ Xato:', error.message);
    }
  }
  process.exit(0);
}

addSMSColumn();
