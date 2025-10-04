const { query } = require('./src/database/index');

async function setup() {
  try {
    // Jadvalni yaratish (agar yo'q bo'lsa)
    await query(`
      CREATE TABLE IF NOT EXISTS semysms_phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        balance REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        last_used DATETIME,
        total_sent INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ semysms_phones jadvali tayyor');

    // Raqamlarni qo'shish
    const phones = [
      { phone: '998951370685', balance: 156 },
      { phone: '998951090685', balance: 156 },
      { phone: '998991250966', balance: 4304 },
      { phone: '998991420966', balance: 5823 }
    ];

    for (const p of phones) {
      try {
        await query(
          'INSERT OR IGNORE INTO semysms_phones (phone, balance) VALUES (?, ?)',
          [p.phone, p.balance]
        );
        console.log(`✓ Qo'shildi: ${p.phone}`);
      } catch (err) {
        console.log(`✗ Xato: ${p.phone} - ${err.message}`);
      }
    }

    // Tekshirish
    const all = await query('SELECT * FROM semysms_phones');
    console.log(`\n✅ Jami: ${all.length} ta raqam`);

  } catch (error) {
    console.error('❌ Xato:', error.message);
  }

  process.exit(0);
}

setup();
