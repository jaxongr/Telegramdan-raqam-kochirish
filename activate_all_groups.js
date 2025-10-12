const { query } = require('./src/database/sqlite');

(async () => {
  try {
    console.log('🔄 Barcha guruhlarni aktivlashtirish...\n');

    // Hozirgi holatni ko'rsatish
    const allGroups = await query('SELECT id, name, active FROM groups ORDER BY id');

    console.log('=== HOZIRGI HOLAT ===');
    allGroups.forEach((g, idx) => {
      const status = Number(g.active) === 1 ? '✅ Aktiv' : '❌ Aktiv emas';
      console.log(`${idx + 1}. ${g.name} - ${status}`);
    });

    console.log(`\nJami: ${allGroups.length} ta guruh`);
    console.log(`Aktiv: ${allGroups.filter(g => Number(g.active) === 1).length} ta\n`);

    // Hammasini aktivlashtirish
    console.log('🔄 Hammasini aktivlashtirish...\n');

    const result = await query('UPDATE groups SET active = 1');

    console.log('✅ Bajarildi!\n');

    // Yangi holatni ko'rsatish
    const updatedGroups = await query('SELECT id, name, active FROM groups ORDER BY id');

    console.log('=== YANGI HOLAT ===');
    updatedGroups.forEach((g, idx) => {
      const status = Number(g.active) === 1 ? '✅ Aktiv' : '❌ Aktiv emas';
      console.log(`${idx + 1}. ${g.name} - ${status}`);
    });

    const activeCount = updatedGroups.filter(g => Number(g.active) === 1).length;
    console.log(`\nJami: ${updatedGroups.length} ta guruh`);
    console.log(`Aktiv: ${activeCount} ta`);

    if (activeCount === updatedGroups.length) {
      console.log('\n✅ HAMMASI AKTIV!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Xato:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
