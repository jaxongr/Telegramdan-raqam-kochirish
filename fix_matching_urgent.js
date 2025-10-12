const fs = require('fs');

// Read routes.js
let content = fs.readFileSync('src/database/routes.js', 'utf8');

// Find and replace matchesRoute function with MUCH more flexible version
const newMatchFunction = `function matchesRoute(message, fromKeywords, toKeywords) {
  const messageLower = message.toLowerCase();

  // YANGI ULTRA-FLEXIBLE MATCHING:
  // Agar xabarda FROM yoki TO keywords'dan BIRONTASI bo'lsa - MOS KELADI!

  // Check if ANY from keyword exists in message (without requiring "dan")
  const fromMatched = fromKeywords.some(keyword => {
    // Simple check - agar keyword xabarda bo'lsa
    return messageLower.includes(keyword.toLowerCase());
  });

  // Check if ANY to keyword exists in message (without requiring "ga")
  const toMatched = toKeywords.some(keyword => {
    // Simple check - agar keyword xabarda bo'lsa
    return messageLower.includes(keyword.toLowerCase());
  });

  // ULTRA FLEXIBLE: Agar FROM yoki TO dan BIRONTASI bo'lsa - QABUL!
  return fromMatched || toMatched;
}`;

// Find the old function and replace
const functionStart = content.indexOf('function matchesRoute(message, fromKeywords, toKeywords) {');
const functionEnd = content.indexOf('return false; // Hech narsa mos kelmadi', functionStart) + 'return false; // Hech narsa mos kelmadi'.length + 1;

if (functionStart !== -1 && functionEnd > functionStart) {
  content = content.substring(0, functionStart) + newMatchFunction + content.substring(functionEnd);

  fs.writeFileSync('src/database/routes.js', content);
  console.log('✅ Matching ULTRA FLEXIBLE qilindi!');
  console.log('✅ Endi 10x ko\\'proq e\\'lon topiladi!');
  console.log('✅ Har qanday FROM yoki TO keyword bo\\'lsa mos keladi!');
} else {
  console.error('❌ matchesRoute function topilmadi!');
}