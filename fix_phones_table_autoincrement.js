const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data/database.sqlite');

console.log('=== FIX: Phones table AUTOINCREMENT muammosi ===\n');
console.log('Database:', dbPath);

const db = new Database(dbPath);

try {
  // 1. Eski phones table'dagi ma'lumotlarni backup qilish
  console.log('\n1. Backup olinmoqda...');
  const oldPhones = db.prepare('SELECT * FROM phones WHERE id IS NOT NULL').all();
  console.log(`   ✓ ${oldPhones.length} ta raqam backup qilindi`);

  // 2. Phones table'ni o'chirish
  console.log('\n2. Eski phones table o\'chirilmoqda...');
  db.exec('DROP TABLE IF EXISTS phones');
  console.log('   ✓ Eski table o\'chirildi');

  // 3. Yangi phones table yaratish (AUTOINCREMENT bilan)
  console.log('\n3. Yangi phones table yaratilmoqda...');
  db.exec(`
    CREATE TABLE phones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      first_date DATETIME NOT NULL,
      last_date DATETIME NOT NULL,
      repeat_count INTEGER DEFAULT 1,
      lifetime_unique INTEGER DEFAULT 0,
      first_message TEXT DEFAULT '',
      last_message TEXT DEFAULT '',
      FOREIGN KEY (group_id) REFERENCES groups(id),
      UNIQUE(phone, group_id)
    )
  `);
  console.log('   ✓ Yangi table yaratildi');

  // 4. Ma'lumotlarni qayta kiritish
  console.log('\n4. Ma\'lumotlar qayta kiritilmoqda...');
  const insertStmt = db.prepare(`
    INSERT INTO phones (phone, group_id, first_date, last_date, repeat_count, lifetime_unique, first_message, last_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let restoredCount = 0;
  for (const phone of oldPhones) {
    try {
      insertStmt.run(
        phone.phone,
        phone.group_id,
        phone.first_date || new Date().toISOString(),
        phone.last_date || new Date().toISOString(),
        phone.repeat_count || 1,
        phone.lifetime_unique || 0,
        phone.first_message || '',
        phone.last_message || ''
      );
      restoredCount++;
    } catch (err) {
      console.log(`   ⚠ Xato (skip): ${phone.phone} - ${err.message}`);
    }
  }
  console.log(`   ✓ ${restoredCount} ta raqam qayta kiritildi`);

  // 5. Test
  console.log('\n5. Test qilinmoqda...');
  const testPhone = '+998999TEST999';
  const testResult = db.prepare(`
    INSERT INTO phones (phone, group_id, first_date, last_date, repeat_count, lifetime_unique, first_message, last_message)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testPhone, 1, new Date().toISOString(), new Date().toISOString(), 1, 0, 'Test message', 'Test message');

  console.log(`   Insert lastInsertRowid: ${testResult.lastInsertRowid}`);

  const testSelect = db.prepare('SELECT id, phone FROM phones WHERE phone = ?').get(testPhone);
  console.log(`   SELECT id: ${testSelect.id}`);
  console.log(`   SELECT id type: ${typeof testSelect.id}`);

  if (testSelect.id && typeof testSelect.id === 'number') {
    console.log('\n✅✅✅ FIX MUVAFFAQIYATLI! AUTOINCREMENT ishlayapti!');
  } else {
    console.log('\n❌ Hali ham muammo bor');
  }

  // Test raqamni o'chirish
  db.prepare('DELETE FROM phones WHERE phone = ?').run(testPhone);

  db.close();
  console.log('\n=== FIX TUGADI ===\n');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Xato:', error);
  db.close();
  process.exit(1);
}
