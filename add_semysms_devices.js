const Database = require('better-sqlite3');

const db = new Database('./data/database.sqlite');

// SemySMS qurilmalarni qo'shish
const devices = [
  { device_id: '354041', phone: '+998951370685', operator: 'Uztelecom', model: 'SM-A600FN' },
  { device_id: '353908', phone: '+998951090685', operator: 'Uztelecom', model: 'SM-A600FN' },
  { device_id: '353890', phone: '+998991250966', operator: 'Uztelecom', model: 'SM-A600FN' },
  { device_id: '353889', phone: '+998991420966', operator: 'UzMobile', model: 'SM-A600FN' }
];

console.log('🔧 SemySMS qurilmalarni qo\'shish boshlandi...\n');

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO semysms_phones (device_id, phone, status, balance, total_sent)
  VALUES (?, ?, 'active', 0, 0)
`);

devices.forEach(device => {
  try {
    insertStmt.run(device.device_id, device.phone);
    console.log(`✅ Qo'shildi: ${device.phone} (Device ID: ${device.device_id}) - ${device.operator}`);
  } catch (error) {
    console.log(`❌ Xato: ${device.phone} - ${error.message}`);
  }
});

console.log('\n📊 Natija:');
const count = db.prepare('SELECT COUNT(*) as total FROM semysms_phones').get();
console.log(`Jami SemySMS qurilmalar: ${count.total}\n`);

// Ro'yxatni ko'rsatish
const phones = db.prepare('SELECT * FROM semysms_phones').all();
phones.forEach(p => {
  console.log(`  ${p.phone} - Device ID: ${p.device_id} - ${p.operator} (${p.status})`);
});

db.close();
console.log('\n✅ Tayyor!');
