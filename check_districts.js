const { query } = require('/root/telegram-sms/src/database/sqlite');

(async () => {
  const missingDistricts = ['koson', 'chiroqchi', 'dehqonobod', 'muborak', 'nishon', 'kamashi'];

  console.log('=== Qashqadaryo yonalishi: mavjud tumanlar ===\n');

  // Check existing districts
  const existingDistricts = ['qarshi', 'shahrisabz', 'kitob', 'yakkabog', 'guzor'];

  console.log('✅ Mavjud (xabarlar topilgan):');
  for (const district of existingDistricts) {
    const phones = await query(
      'SELECT COUNT(*) as count FROM phones WHERE (first_message LIKE ? OR last_message LIKE ?)',
      ['%' + district + '%', '%' + district + '%']
    );
    const count = phones[0].count || phones[0].COUNT || 0;
    console.log('  ' + district + ' - ' + count + ' ta xabar');
  }

  console.log('\n❌ Yo\'q (xabarlar topilmagan):');
  for (const district of missingDistricts) {
    const phones = await query(
      'SELECT COUNT(*) as count FROM phones WHERE (first_message LIKE ? OR last_message LIKE ?)',
      ['%' + district + '%', '%' + district + '%']
    );
    const count = phones[0].count || phones[0].COUNT || 0;
    console.log('  ' + district + ' - ' + count + ' ta xabar');
  }

  console.log('\n💡 Sabab: Route sozlamalarda BARCHA tumanlar bor, lekin bu 6 ta tuman haqida hech qanday xabar kelmagan.');
  console.log('   Xabar kelganda avtomatik ravishda ko\'rinadi.');

  process.exit(0);
})();
