/**
 * ДУБЛИКАТ ЙЎНАЛИШЛАРНИ ДЕАКТИВАЦИЯ ҚИЛИШ
 * Ўчириш ўрнига active=0 қилиш (эълонлар сақланади)
 */

const { query } = require('./src/database/sqlite');

async function deactivateDuplicateRoutes() {
  try {
    console.log('\n🔍 ДУБЛИКАТ ЙЎНАЛИШЛАРНИ ТОПИШ...\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Барча йўналишларни олиш
    const routes = await query(`
      SELECT id, name, active
      FROM routes
      WHERE (name LIKE '%Koson%' OR name LIKE '%Nishon%')
      ORDER BY id
    `);

    console.log(`📊 Топилди: ${routes.length} та Koson/Nishon йўналиши\n`);

    // Дубликатларни гуруҳлаш
    const grouped = {};

    routes.forEach(r => {
      const name = (r.name || r.NAME).toLowerCase().trim();
      const id = r.id || r.ID;
      const active = r.active || r.ACTIVE;

      if (!grouped[name]) {
        grouped[name] = [];
      }
      grouped[name].push({ id, name: r.name || r.NAME, active });
    });

    // Дубликатларни деактивация қилиш
    const toDeactivate = [];

    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        console.log(`❌ ДУБЛИКАТ: "${items[0].name}"`);
        items.forEach((item, i) => {
          const status = item.active ? '✅ ACTIVE' : '❌ Inactive';
          console.log(`   ${i + 1}. ID ${item.id} - ${status}`);
        });

        // Биринчисини сақлаш, қолганларини деактивация
        for (let i = 1; i < items.length; i++) {
          toDeactivate.push(items[i].id);
          console.log(`   → ID ${items[i].id} деактивация қилинади`);
        }
        console.log('');
      }
    }

    if (toDeactivate.length === 0) {
      console.log('✅ Дубликат йўналишлар топилмади!\n');
      process.exit(0);
    }

    console.log(`\n📋 Деактивация: ${toDeactivate.length} та дубликат\n`);
    console.log('ID рўйхати:', toDeactivate.join(', '), '\n');

    // Деактивация қилиш
    for (const id of toDeactivate) {
      await query('UPDATE routes SET active = 0 WHERE id = ?', [id]);

      // Эълонлар сони
      const msgCount = await query('SELECT COUNT(*) as cnt FROM route_messages WHERE route_id = ?', [id]);
      const count = msgCount[0].cnt || msgCount[0].CNT || 0;

      console.log(`✅ ID ${id} деактивация қилинди (${count} та эълон сақланди)`);
    }

    console.log('\n═══════════════════════════════════════════════════\n');
    console.log(`✅ ${toDeactivate.length} та дубликат деактивация қилинди!\n`);

    // Фаол йўналишларни кўрсатиш
    console.log('📊 ФАОЛ ЙЎНАЛИШЛАР (Koson/Nishon):\n');
    const active = await query(`
      SELECT id, name,
        (SELECT COUNT(*) FROM route_messages WHERE route_id = routes.id) as msg_count
      FROM routes
      WHERE (name LIKE '%Koson%' OR name LIKE '%Nishon%') AND active = 1
      ORDER BY id
    `);

    active.forEach(r => {
      const name = r.name || r.NAME;
      const id = r.id || r.ID;
      const count = r.msg_count || r.MSG_COUNT || 0;
      console.log(`  ✅ ID ${id}: ${name} (${count} та эълон)`);
    });

    console.log('\n📊 ДЕАКТИВ ЙЎНАЛИШЛАР:\n');
    const inactive = await query(`
      SELECT id, name,
        (SELECT COUNT(*) FROM route_messages WHERE route_id = routes.id) as msg_count
      FROM routes
      WHERE (name LIKE '%Koson%' OR name LIKE '%Nishon%') AND active = 0
      ORDER BY id
    `);

    inactive.forEach(r => {
      const name = r.name || r.NAME;
      const id = r.id || r.ID;
      const count = r.msg_count || r.MSG_COUNT || 0;
      console.log(`  ❌ ID ${id}: ${name} (${count} та эълон сақланган)`);
    });

    console.log('\n✅ Тозалаш тугади!\n');
    console.log('💡 Эълонлар сақланган. Агар керак бўлса, кейинроқ ўчириш мумкин.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

deactivateDuplicateRoutes();
