/**
 * ДУБЛИКАТ ЙЎНАЛИШЛАРНИ ЎЧИРИШ
 * Koson va Nishon учун 2 марта яратилган йўналишларни тозалаш
 */

const { query } = require('./src/database/sqlite');

async function removeDuplicateRoutes() {
  try {
    console.log('\n🔍 ДУБЛИКАТ ЙЎНАЛИШЛАРНИ ТОПИШ...\n');
    console.log('═══════════════════════════════════════════════════\n');

    // Барча йўналишларни олиш
    const routes = await query(`
      SELECT id, name, from_keywords, to_keywords, active
      FROM routes
      WHERE name LIKE '%Koson%' OR name LIKE '%Nishon%'
      ORDER BY id
    `);

    console.log(`📊 Топилди: ${routes.length} та Koson/Nishon йўналиши\n`);

    // Дубликатларни гуруҳлаш
    const grouped = {};

    routes.forEach(r => {
      const name = r.name || r.NAME;
      const key = name.toLowerCase().trim();

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        id: r.id || r.ID,
        name: name,
        from: r.from_keywords || r.FROM_KEYWORDS,
        to: r.to_keywords || r.TO_KEYWORDS
      });
    });

    // Дубликатларни аниқлаш
    const duplicates = [];
    for (const [key, items] of Object.entries(grouped)) {
      if (items.length > 1) {
        console.log(`❌ ДУБЛИКАТ ТОПИЛДИ: "${items[0].name}"`);
        items.forEach((item, i) => {
          console.log(`   ${i + 1}. ID ${item.id}`);
        });

        // Биринчидан ташқари ҳаммасини дубликат деб белгилаш
        for (let i = 1; i < items.length; i++) {
          duplicates.push(items[i].id);
        }
        console.log('');
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ Дубликат йўналишлар топилмади!\n');
      process.exit(0);
    }

    console.log(`\n📋 Ўчирилиши керак: ${duplicates.length} та дубликат\n`);
    console.log('ID рўйхати:', duplicates.join(', '), '\n');

    // Ҳар бир дубликатни ўчириш
    for (const id of duplicates) {
      // Аввал эълонларни кўчириш (agar бор бўлса)
      const messages = await query('SELECT * FROM route_messages WHERE route_id = ?', [id]);

      if (messages.length > 0) {
        console.log(`⚠️  ID ${id}: ${messages.length} та эълон топилди`);

        // Эски йўналишга кўчириш керак
        const route = routes.find(r => (r.id || r.ID) === id);
        const routeName = route.name || route.NAME;
        const originalRoute = grouped[routeName.toLowerCase().trim()][0];

        console.log(`   Эълонларни ID ${originalRoute.id} га кўчириш...`);

        // Эълонларни route_id ни ўзгартириш
        try {
          await query(
            'UPDATE route_messages SET route_id = ? WHERE route_id = ?',
            [originalRoute.id, id]
          );
          console.log(`   ✅ ${messages.length} та эълон кўчирилди\n`);
        } catch (err) {
          console.log(`   ⚠️  Баъзи эълонлар дубликат, ўчирилади\n`);
        }
      }

      // Йўналишни ўчириш
      await query('DELETE FROM routes WHERE id = ?', [id]);
      console.log(`✅ ID ${id} ўчирилди`);
    }

    console.log('\n═══════════════════════════════════════════════════\n');
    console.log(`✅ ${duplicates.length} та дубликат йўналиш ўчирилди!\n`);

    // Қолган йўналишларни кўрсатиш
    console.log('📊 ҚОЛГАН ЙЎНАЛИШЛАР:\n');
    const remaining = await query(`
      SELECT id, name,
        (SELECT COUNT(*) FROM route_messages WHERE route_id = routes.id) as msg_count
      FROM routes
      WHERE name LIKE '%Koson%' OR name LIKE '%Nishon%'
      ORDER BY id
    `);

    remaining.forEach(r => {
      const name = r.name || r.NAME;
      const id = r.id || r.ID;
      const count = r.msg_count || r.MSG_COUNT || 0;
      console.log(`  ✅ ID ${id}: ${name} (${count} та эълон)`);
    });

    console.log('\n✅ Тозалаш тугади!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Хато:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

removeDuplicateRoutes();
