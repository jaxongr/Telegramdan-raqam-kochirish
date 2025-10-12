const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/database/routes.js');
const backupPath = path.join(__dirname, 'src/database/routes.js.backup_matching');

// Backup
fs.copyFileSync(filePath, backupPath);
console.log('✅ Backup created:', backupPath);

// Read file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace matchesRoute function with more flexible version
const oldFunction = `function matchesRoute(message, fromKeywords, toKeywords) {
  const messageLower = message.toLowerCase();

  // FROM location + aniqlovchi (dan/дан)
  const fromMatched = fromKeywords.some(keyword => {
    // Regex: keyword + optional space + (dan/дан) + word boundary
    const patterns = [
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\s*(dan|дан)\\\\b', 'i'),
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\b', 'i') // Aniqlovchisiz ham qabul qilish
    ];
    return patterns.some(pattern => pattern.test(messageLower));
  });

  // TO location + aniqlovchi (ga/ка/га)
  const toMatched = toKeywords.some(keyword => {
    const patterns = [
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\s*(ga|га|ка)\\\\b', 'i'),
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\b', 'i')`;

const newFunction = `function matchesRoute(message, fromKeywords, toKeywords) {
  const messageLower = message.toLowerCase();

  // FROM location + aniqlovchi (dan/дан/от)
  const fromMatched = fromKeywords.some(keyword => {
    const patterns = [
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\s*(dan|дан|от)\\\\b', 'i'),
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\b', 'i') // Aniqlovchisiz ham
    ];
    return patterns.some(pattern => pattern.test(messageLower));
  });

  // TO location + aniqlovchi (ga/ка/га/в)
  const toMatched = toKeywords.some(keyword => {
    const patterns = [
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\s*(ga|га|ка|в)\\\\b', 'i'),
      new RegExp('\\\\b' + escapeRegex(keyword) + '\\\\b', 'i')`;

// Check if we need to continue finding the end
const endMarker = "return fromMatched && toMatched;";

if (content.includes(endMarker)) {
  // Replace the ending to be more flexible
  content = content.replace(endMarker, `// YANGI LOGIKA: FROM yoki TO bo'lsa ham qabul qilamiz (strict emas)
  // Agar ikkala yo'nalish ham bo'lsa - ideal
  // Agar faqat FROM yoki faqat TO bo'lsa ham - qabul qilamiz

  // Ideal: Ikkala yo'nalish ham bor
  if (fromMatched && toMatched) {
    return true;
  }

  // Yaxshi: Kamida bittasi bor
  if (fromMatched || toMatched) {
    return true;
  }

  return false;`);

  console.log('✅ matchesRoute ending updated to be more flexible');
}

// Replace patterns
if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  console.log('✅ matchesRoute patterns updated');
}

fs.writeFileSync(filePath, content);
console.log('✅ Route matching optimized!');
console.log('✅ Endi FROM yoki TO bo\\'lsa ham e\\'lonlar topiladi!');
console.log('✅ Ko\\'proq e\\'lonlar matching bo\\'ladi!');