const { query } = require('./src/database/sqlite');

async function createRoutesTable() {
  console.log('📊 Routes table yaratilmoqda...\n');

  // Routes table yaratish
  await query(`
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      from_keywords TEXT NOT NULL,
      to_keywords TEXT NOT NULL,
      from_region TEXT,
      to_region TEXT,
      use_region_matching INTEGER DEFAULT 0,
      sms_template TEXT,
      time_window_minutes INTEGER DEFAULT 120,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Routes table yaratildi');

  // Route SMS logs table
  await query(`
    CREATE TABLE IF NOT EXISTS route_sms_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL,
      to_phone TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes(id)
    )
  `);
  console.log('✅ Route SMS logs table yaratildi');

  // Index'lar
  await query('CREATE INDEX IF NOT EXISTS idx_routes_active ON routes(active)');
  await query('CREATE INDEX IF NOT EXISTS idx_route_logs_sent ON route_sms_logs(sent_at)');
  console.log('✅ Index\'lar yaratildi');

  // Asosiy yo'nalishlar qo'shish
  const routes = [
    // Toshkent yo'nalishlari
    { name: 'Toshkent → Qarshi', from: 'toshkent,tashkent,ташкент', to: 'qarshi,karshi,қарши' },
    { name: 'Qarshi → Toshkent', from: 'qarshi,karshi,қарши', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Samarqand', from: 'toshkent,tashkent,ташкент', to: 'samarqand,samarkand,самарқанд' },
    { name: 'Samarqand → Toshkent', from: 'samarqand,samarkand,самарқанд', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Buxoro', from: 'toshkent,tashkent,ташкент', to: 'buxoro,bukhara,бухоро' },
    { name: 'Buxoro → Toshkent', from: 'buxoro,bukhara,бухоро', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Andijon', from: 'toshkent,tashkent,ташкент', to: 'andijon,andijan,андижон' },
    { name: 'Andijon → Toshkent', from: 'andijon,andijan,андижон', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Farg\'ona', from: 'toshkent,tashkent,ташкент', to: 'fargona,fergana,фарғона' },
    { name: 'Farg\'ona → Toshkent', from: 'fargona,fergana,фарғона', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Namangan', from: 'toshkent,tashkent,ташкент', to: 'namangan,наманган' },
    { name: 'Namangan → Toshkent', from: 'namangan,наманган', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Jizzax', from: 'toshkent,tashkent,ташкент', to: 'jizzax,jizzah,жиззах' },
    { name: 'Jizzax → Toshkent', from: 'jizzax,jizzah,жиззах', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Navoiy', from: 'toshkent,tashkent,ташкент', to: 'navoiy,navoi,навоий' },
    { name: 'Navoiy → Toshkent', from: 'navoiy,navoi,навоий', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Urganch', from: 'toshkent,tashkent,ташкент', to: 'urganch,urgench,урганч' },
    { name: 'Urganch → Toshkent', from: 'urganch,urgench,урганч', to: 'toshkent,tashkent,ташкент' },
    { name: 'Toshkent → Nukus', from: 'toshkent,tashkent,ташкент', to: 'nukus,нукус' },
    { name: 'Nukus → Toshkent', from: 'nukus,нукус', to: 'toshkent,tashkent,ташкент' }
  ];

  console.log('\n📍 Yo\'nalishlar qo\'shilmoqda...');
  let added = 0;

  for (const route of routes) {
    const existing = await query('SELECT id FROM routes WHERE name = ?', [route.name]);

    if (existing.length === 0) {
      await query(
        'INSERT INTO routes (name, from_keywords, to_keywords, sms_template, time_window_minutes) VALUES (?, ?, ?, ?, ?)',
        [
          route.name,
          route.from,
          route.to,
          `Assalomu alaykum! ${route.name} yo'nalishida yo'lovchi kerakmi? Tel: {{phone}}`,
          120
        ]
      );
      console.log(`  ✓ ${route.name}`);
      added++;
    } else {
      console.log(`  ⚠️  Mavjud: ${route.name}`);
    }
  }

  console.log(`\n✅ ${added} ta yangi yo'nalish qo'shildi`);

  // Statistika
  const totalRoutes = await query('SELECT COUNT(*) as count FROM routes');
  const activeRoutes = await query('SELECT COUNT(*) as count FROM routes WHERE active = 1');

  console.log('\n📊 STATISTIKA:');
  console.log(`  • Jami yo'nalishlar: ${totalRoutes[0].count}`);
  console.log(`  • Faol yo'nalishlar: ${activeRoutes[0].count}`);
}

createRoutesTable().catch(console.error);