#!/usr/bin/env node
const bcrypt = require('bcryptjs');

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.log('Foydalanish: node scripts/hash-password.js <parol>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  console.log('WEB_PASSWORD_HASH=' + hash);
}

main().catch(err => {
  console.error('Xato:', err);
  process.exit(1);
});

