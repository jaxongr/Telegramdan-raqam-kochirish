/**
 * MIGRATION: route_messages ga UNIQUE constraint qo'shish
 * route_id + message_text kombinatsiyasi unikal bo'lishi kerak
 */

const { getDatabase } = require('./src/database/sqlite');

async function addUniqueConstraint() {
  console.log('🔧 UNIQUE CONSTRAINT QO\'SHISH...\\n');

  try {
    const db = getDatabase();

    // 1. Avval dublikatlarni tozalash (cleanup script orqali)
    console.log('⚠️  Birinchi cleanup script ishga tushiring: node fix_duplicate_announcements.js\\n');

    // 2. Yangi jadval yaratish (UNIQUE constraint bilan)
    console.log('📦 Yangi jadval yaratilmoqda...\\n');
    db.exec(`
      CREATE TABLE route_messages_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        route_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        message_text TEXT NOT NULL,
        phone_numbers TEXT,
        message_date DATETIME NOT NULL,
        sms_sent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        UNIQUE(route_id, message_text)
      )
    `);

    // 3. Ma'lumotlarni ko'chirish (faqat unikal qatorlar)
    console.log('📋 Ma\\'lumotlar ko\\'chirilmoqda...\\n');
    const result = db.prepare(`
      INSERT OR IGNORE INTO route_messages_new
        (id, route_id, group_id, message_text, phone_numbers, message_date, sms_sent, created_at)
      SELECT id, route_id, group_id, message_text, phone_numbers, message_date, sms_sent, created_at
      FROM route_messages
      ORDER BY created_at ASC
    `).run();

    console.log(`   ✓ ${result.changes} ta qator ko\\'chirildi\\n`);

    // 4. Eski jadvalni o'chirish
    console.log('🗑️  Eski jadval o\\'chirilmoqda...\\n');
    db.exec('DROP TABLE route_messages');

    // 5. Yangi jadvalni qayta nomlash
    console.log('✏️  Yangi jadval nomlanmoqda...\\n');
    db.exec('ALTER TABLE route_messages_new RENAME TO route_messages');

    // 6. Indexlarni qayta yaratish
    console.log('📊 Indexlar yaratilmoqda...\\n');
    db.exec(`
      CREATE INDEX idx_route_messages_route ON route_messages(route_id);
      CREATE INDEX idx_route_messages_date ON route_messages(message_date);
    `);

    console.log('\\n✅ MIGRATION MUVAFFAQIYATLI!');
    console.log('   route_messages endi UNIQUE(route_id, message_text) ga ega\\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

addUniqueConstraint();
