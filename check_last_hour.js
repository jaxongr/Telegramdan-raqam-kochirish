const db = require('better-sqlite3')('./data/database.sqlite', { readonly: true });

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

console.log('=== OXIRGI 1 SOAT ===\n');

const stats = db.prepare(`
  SELECT status, COUNT(*) as count
  FROM sms_logs
  WHERE sent_at >= ?
  GROUP BY status
`).all(oneHourAgo);

let total = 0;
stats.forEach(s => {
  console.log(`${s.status}: ${s.count}`);
  total += s.count;
});

console.log(`\nJAMI: ${total}`);

if (total > 0) {
  const success = stats.find(s => s.status === 'success')?.count || 0;
  const failed = stats.find(s => s.status === 'failed')?.count || 0;
  const cooldown = stats.find(s => s.status === 'cooldown')?.count || 0;

  console.log(``);
  console.log(`✅ Success: ${success} (${((success/total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
  console.log(`⏸️  Cooldown: ${cooldown} (${((cooldown/total)*100).toFixed(1)}%)`);

  console.log(`\n=== XULOSA ===`);
  if (failed === 0) {
    console.log(`✅✅✅ AJOYIB! Oxirgi 1 soatda 0 ta xato!`);
    console.log(`Tizim 100% to'g'ri ishlayapti!`);
  } else {
    console.log(`⚠️  ${failed} ta xato bor, tekshirish kerak.`);
  }
}

db.close();
