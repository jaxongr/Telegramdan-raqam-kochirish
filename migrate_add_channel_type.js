/**
 * MIGRATION: groups jadvalida 'type' qo'shish (group/channel)
 *
 * Isga tushirish: node migrate_add_channel_type.js
 */

const { getDatabase } = require('./src/database/sqlite');

async function addChannelType() {
  console.log('=== CHANNEL TYPE MIGRATION ===\n');

  try {
    const db = getDatabase();

    // 1. Table info ni olish
    const tableInfo = db.prepare('PRAGMA table_info(groups)').all();
    const hasTypeColumn = tableInfo.some(col => col.name === 'type');

    if (hasTypeColumn) {
      console.log('type column allaqachon mavjud!');
      process.exit(0);
    }

    // 2. type column qo'shish
    console.log('type column qo\'shilmoqda...');
    db.exec('ALTER TABLE groups ADD COLUMN type TEXT DEFAULT \'group\'');
    console.log('✓ type column qo\'shildi');

    // 3. Mavjud guruhlarni type="group" deb yangilash (agar default ishlamasa)
    const updateResult = db.prepare('UPDATE groups SET type = \'group\' WHERE type IS NULL').run();
    console.log(`✓ ${updateResult.changes} ta qator yangilandi (type='group')`);

    // 4. Index qo'shish
    console.log('Index yaratilmoqda...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type)');
    console.log('✓ Index yaratildi');

    // 5. Statistika
    const totalGroups = db.prepare('SELECT COUNT(*) as c FROM groups').get().c;
    const typeGroups = db.prepare('SELECT COUNT(*) as c FROM groups WHERE type = \'group\'').get().c;
    const typeChannels = db.prepare('SELECT COUNT(*) as c FROM groups WHERE type = \'channel\'').get().c;

    console.log('\n=== STATISTIKA ===');
    console.log(`Jami:        ${totalGroups}`);
    console.log(`Groups:      ${typeGroups}`);
    console.log(`Channels:    ${typeChannels}`);

    console.log('\n✅ MIGRATION MUVAFFAQIYATLI!');
    console.log('\nEndi guruhlar va kanallar kuzatilishi mumkin.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addChannelType();
