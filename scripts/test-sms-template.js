/**
 * SMS shablon test script
 *
 * Ishlatish: node scripts/test-sms-template.js
 */

const { renderSMSTemplate } = require('../src/services/smsService');

console.log('📝 SMS Shablon Testi\n');

// Test 1: Barcha o'zgaruvchilar bilan
const template1 = "Assalomu alaykum {{name}}! {{group}} guruhida {{time}} da raqamingiz {{phone}} ni ko'rdik. Aloqa: {{date}}";
const variables1 = {
  phone: '+998901234567',
  group: 'Toshkent Taxi Xizmati',
  name: 'Jasur',
  foundAt: new Date('2025-10-07T14:30:00')
};

console.log('Test 1: Barcha o\'zgaruvchilar');
console.log('Shablon:', template1);
console.log('Natija:', renderSMSTemplate(template1, variables1));
console.log('');

// Test 2: Ism yo'q ({{name}} o'chiriladi)
const template2 = "Assalomu alaykum {{name}}! {{group}} guruhida raqamingizni ko'rdik.";
const variables2 = {
  phone: '+998901234567',
  group: 'Toshkent Taxi',
  // name yo'q
};

console.log('Test 2: Ism yo\'q');
console.log('Shablon:', template2);
console.log('Natija:', renderSMSTemplate(template2, variables2));
console.log('');

// Test 3: Hozirgi vaqt (foundAt berilmagan)
const template3 = "Xabar yuborildi: {{time}}, {{date}}";
const variables3 = {
  phone: '+998901234567',
  group: 'Test'
};

console.log('Test 3: Hozirgi vaqt');
console.log('Shablon:', template3);
console.log('Natija:', renderSMSTemplate(template3, variables3));
console.log('');

// Test 4: Faqat telefon
const template4 = "Sizning raqamingiz: {{phone}}";
const variables4 = {
  phone: '+998905551234'
};

console.log('Test 4: Faqat telefon');
console.log('Shablon:', template4);
console.log('Natija:', renderSMSTemplate(template4, variables4));
console.log('');

// Test 5: Real misol
const template5 = "Assalomu alaykum! {{group}} guruhida {{time}}da e'lon qoldirgansiz. Bizning taxi xizmatimiz haqida: +998901234567";
const variables5 = {
  phone: '+998905551234',
  group: 'Samarqand-Toshkent Taxi',
  foundAt: new Date()
};

console.log('Test 5: Real misol');
console.log('Shablon:', template5);
console.log('Natija:', renderSMSTemplate(template5, variables5));
console.log('');

console.log('✅ Barcha testlar tugadi!');
