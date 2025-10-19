/**
 * БАРЧА EJS ФАЙЛЛАРДА TIMEZONE ТУЗАТИШ
 * toLocaleString('uz-UZ') → toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })
 */

const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'src', 'web', 'views');

// Recursive файл излаш
function getAllEjsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllEjsFiles(filePath, fileList);
    } else if (file.endsWith('.ejs')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Файл таҳрирлаш
function fixTimezoneInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern 1: toLocaleString('uz-UZ') without timeZone
  const pattern1 = /toLocaleString\('uz-UZ'\)(?!\s*,\s*\{\s*timeZone)/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, "toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })");
    changed = true;
  }

  // Pattern 2: toLocaleDateString('uz-UZ') without timeZone
  const pattern2 = /toLocaleDateString\('uz-UZ'\)(?!\s*,\s*\{\s*timeZone)/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, "toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })");
    changed = true;
  }

  // Pattern 3: toLocaleTimeString('uz-UZ') without timeZone
  const pattern3 = /toLocaleTimeString\('uz-UZ'\)(?!\s*,\s*\{\s*timeZone)/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, "toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' })");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`);
    return true;
  }

  return false;
}

// Асосий функция
function main() {
  console.log('\n🔧 TIMEZONE ТУЗАТИШ СКРИПТИ\n');
  console.log('═══════════════════════════════════════════════════\n');

  const ejsFiles = getAllEjsFiles(viewsDir);
  console.log(`📂 Топилди: ${ejsFiles.length} та EJS файл\n`);

  let fixedCount = 0;

  ejsFiles.forEach(file => {
    if (fixTimezoneInFile(file)) {
      fixedCount++;
    }
  });

  console.log('\n═══════════════════════════════════════════════════\n');

  if (fixedCount > 0) {
    console.log(`✅ ${fixedCount} та файл тузатилди!`);
    console.log('\nҲаммасида энди Asia/Tashkent timezone ишлатилади.\n');
  } else {
    console.log('✅ Барча файлларда timezone аллақачон тўғри!\n');
  }
}

main();
