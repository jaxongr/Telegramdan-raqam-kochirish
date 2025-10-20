const Database = require('better-sqlite3');
const fs = require('fs');

// Eski database'dan to'g'ri routelarni o'qish
const oldDb = new Database('./data/database.sqlite', { readonly: true });
const routes = oldDb.prepare('SELECT * FROM routes WHERE id >= 12186 AND id <= 12198 ORDER BY id').all();

console.log('Topilgan routes:', routes.length);
routes.forEach(r => console.log(`  ${r.id}: ${r.name}`));

// Yangi database yaratish
if (fs.existsSync('./data/database_clean.sqlite')) {
  fs.unlinkSync('./data/database_clean.sqlite');
}

const newDb = new Database('./data/database_clean.sqlite');

// Barcha jadvallarn yaratish (minimal schema)
newDb.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    group_id INTEGER,
    first_message TEXT,
    last_message TEXT,
    first_date DATETIME,
    last_date DATETIME,
    repeat_count INTEGER DEFAULT 1,
    lifetime_unique INTEGER DEFAULT 1,
    FOREIGN KEY (group_id) REFERENCES groups(id),
    UNIQUE(phone, group_id)
  );

  CREATE TABLE IF NOT EXISTS sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER,
    to_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    error TEXT,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS semysms_phones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    country TEXT,
    operator TEXT,
    cost REAL,
    status TEXT DEFAULT 'active',
    activation_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    from_keywords TEXT NOT NULL,
    to_keywords TEXT NOT NULL,
    sms_template TEXT,
    time_window_minutes INTEGER DEFAULT 120,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS route_sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    to_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'success',
    error TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id)
  );

  CREATE TABLE IF NOT EXISTS route_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    group_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    phone_numbers TEXT,
    message_date DATETIME NOT NULL,
    sms_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );
`);

// Routelarni ko'chirish
const insert = newDb.prepare(`
  INSERT INTO routes (id, name, from_keywords, to_keywords, sms_template, time_window_minutes, active, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

routes.forEach(route => {
  insert.run(
    route.id,
    route.name,
    route.from_keywords,
    route.to_keywords,
    route.sms_template,
    route.time_window_minutes,
    route.active,
    route.created_at,
    route.updated_at
  );
});

console.log('\n✅ Yangi toza database yaratildi: data/database_clean.sqlite');
console.log(`✅ ${routes.length} ta route ko'chirildi`);

oldDb.close();
newDb.close();
