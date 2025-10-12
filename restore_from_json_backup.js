const fs = require('fs');
const { query } = require('./src/database/sqlite');

async function restoreFromJSON() {
  console.log('📦 Restoring database from JSON backup...\n');

  try {
    // 1. Download backup from server
    const { execSync } = require('child_process');
    console.log('📥 Downloading backup from server...');
    execSync('scp -o StrictHostKeyChecking=no root@5.189.141.151:/root/telegram-sms/data/database.json.backup data/database.json.backup');

    // 2. Read JSON backup
    const backup = JSON.parse(fs.readFileSync('data/database.json.backup', 'utf8'));
    console.log('✅ Backup loaded');
    console.log(`  - Groups: ${backup.groups?.length || 0}`);
    console.log(`  - Routes: ${backup.routes?.length || 0}`);
    console.log(`  - Phones: ${backup.phones?.length || 0}\n`);

    // 3. Clear existing data
    console.log('🗑️ Clearing existing data...');
    await query('DELETE FROM phones');
    await query('DELETE FROM groups');
    await query('DELETE FROM routes');
    await query('DELETE FROM route_sms_logs');

    // 4. Restore groups
    if (backup.groups && backup.groups.length > 0) {
      console.log('📌 Restoring groups...');
      for (const group of backup.groups) {
        await query(`
          INSERT OR REPLACE INTO groups (id, name, telegram_id, keywords, sms_template, active, sms_enabled, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          group.id,
          group.name,
          group.telegram_id || group.telegramId || '-100' + group.id,
          group.keywords || '',
          group.sms_template || group.smsTemplate || '',
          group.active !== undefined ? group.active : 1,
          group.sms_enabled || group.smsEnabled || 0,
          group.created_at || group.createdAt || new Date().toISOString()
        ]);
      }
      console.log(`  ✅ ${backup.groups.length} groups restored`);
    }

    // 5. Restore routes
    if (backup.routes && backup.routes.length > 0) {
      console.log('🛣️ Restoring routes...');
      for (const route of backup.routes) {
        await query(`
          INSERT OR REPLACE INTO routes (id, name, from_keywords, to_keywords, sms_template, time_window_minutes, active, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          route.id,
          route.name,
          route.from_keywords || route.fromKeywords || '',
          route.to_keywords || route.toKeywords || '',
          route.sms_template || route.smsTemplate || '',
          route.time_window_minutes || route.timeWindowMinutes || 120,
          route.active !== undefined ? route.active : 1,
          route.created_at || route.createdAt || new Date().toISOString()
        ]);
      }
      console.log(`  ✅ ${backup.routes.length} routes restored`);
    }

    // 6. Restore phones (if needed)
    if (backup.phones && backup.phones.length > 0) {
      console.log('📱 Restoring phones...');
      let count = 0;
      for (const phone of backup.phones.slice(0, 1000)) { // First 1000 only
        try {
          await query(`
            INSERT OR IGNORE INTO phones (phone, group_id, first_message, last_message, first_date, last_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            phone.phone,
            phone.group_id || phone.groupId || 1,
            phone.first_message || phone.firstMessage || '',
            phone.last_message || phone.lastMessage || '',
            phone.first_date || phone.firstDate || new Date().toISOString(),
            phone.last_date || phone.lastDate || new Date().toISOString()
          ]);
          count++;
        } catch (e) {
          // Skip errors
        }
      }
      console.log(`  ✅ ${count} phones restored`);
    }

    // 7. Verify
    const groupCount = await query('SELECT COUNT(*) as count FROM groups');
    const routeCount = await query('SELECT COUNT(*) as count FROM routes');
    const phoneCount = await query('SELECT COUNT(*) as count FROM phones');

    console.log('\n✅ Database restored successfully!');
    console.log(`  - Groups: ${groupCount[0].count}`);
    console.log(`  - Routes: ${routeCount[0].count}`);
    console.log(`  - Phones: ${phoneCount[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

restoreFromJSON();