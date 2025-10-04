const { createSemySMSPhone } = require('./src/database/models');

async function addPhones() {
  const phones = [
    { phone: '998951370685', balance: 156 },
    { phone: '998951090685', balance: 156 },
    { phone: '998991250966', balance: 4304 },
    { phone: '998991420966', balance: 5823 }
  ];

  for (const p of phones) {
    try {
      await createSemySMSPhone(p.phone, p.balance);
      console.log(`✓ Qo'shildi: ${p.phone} (${p.balance} so'm)`);
    } catch (error) {
      console.log(`✗ Xato: ${p.phone} - ${error.message}`);
    }
  }

  console.log('\n✅ Barcha raqamlar qo\'shildi!');
  process.exit(0);
}

addPhones();
