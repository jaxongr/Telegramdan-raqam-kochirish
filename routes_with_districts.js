const { query } = require('./sqlite');

/**
 * Yo'nalishni tekshirish - shahardan keyin "dan" va "ga" bo'lishi kerak
 * @param {string} message - Xabar matni
 * @param {Array<string>} fromCityVariants - FROM shahar variantlari
 * @param {Array<string>} toCityVariants - TO shahar variantlari
 * @returns {boolean} - Yo'nalish to'g'ri yoki yo'q
 */
function checkDirection(message, fromCityVariants, toCityVariants) {
  const msg = message.toLowerCase();

  // FROM shahar uchun: shahar nomidan keyin "dan" yoki "дан" borligini tekshirish
  const fromCityPattern = fromCityVariants.join('|');
  const fromRegex = new RegExp(`(${fromCityPattern})(dan|дан|дан)`, 'i');
  const hasFromDirection = fromRegex.test(msg);

  // TO shahar uchun: shahar nomidan keyin "ga" yoki "га" borligini tekshirish
  const toCityPattern = toCityVariants.join('|');
  const toRegex = new RegExp(`(${toCityPattern})(ga|га|га)`, 'i');
  const hasToDirection = toRegex.test(msg);

  // Ikkisi ham bo'lishi kerak
  return hasFromDirection && hasToDirection;
}

/**
 * Viloyat route uchun tuman bo'yicha e'lonlarni topish
 * @param {number} routeId - Route ID
 * @param {number} timeWindowMinutes - Vaqt oralig'i
 * @returns {Promise<Array>} - Tumanlar bo'yicha e'lonlar
 */
async function findMessagesByDistricts(routeId, timeWindowMinutes = 30) {
  const routes = await query('SELECT * FROM routes WHERE id = ?', [routeId]);
  const route = routes[0];
  
  if (!route) return [];
  
  // Agar oddiy shahar route bo'lsa
  if (!route.use_region_matching || !route.from_region) {
    return null; // Oddiy findMatchingMessages ishlatiladi
  }
  
  // Region ma'lumotlarini olish
  const regions = require('../../regions_structure.json');
  const regionData = regions[route.from_region];
  
  if (!regionData) return [];
  
  const cutoffTime = new Date(Date.now() - parseInt(timeWindowMinutes) * 60 * 1000)
    .toISOString().replace('T', ' ').substring(0, 19);
  
  // To keywords (Toshkent)
  const toKeywords = route.to_keywords.toLowerCase().split(',').map(k => k.trim());
  
  // Har bir tuman uchun alohida qidirish
  const districtResults = [];
  
  for (const city of regionData.cities) {
    const cityName = city.name;
    const cityVariants = city.variants.map(v => v.toLowerCase());
    
    // Bu tuman uchun barcha xabarlarni olish
    const phones = await query(`
      SELECT 
        p.phone, 
        p.last_message, 
        p.last_date, 
        g.name as group_name, 
        g.id as group_id
      FROM phones p
      JOIN groups g ON p.group_id = g.id
      WHERE p.last_date >= ?
      ORDER BY p.last_date DESC
    `, [cutoffTime]);
    
    // Filter: from city va to Toshkent
    const matchedPhones = [];
    const seenPhones = new Set();
    
    phones.forEach(phoneRecord => {
      const msg = (phoneRecord.last_message || '').toLowerCase();

      // Yo'nalishni tekshirish: FROM shahardan TO shaharga
      const directionIsCorrect = checkDirection(msg, cityVariants, toKeywords);
      if (!directionIsCorrect) return;

      // Dublikatni oldini olish
      if (seenPhones.has(phoneRecord.phone)) return;
      seenPhones.add(phoneRecord.phone);

      matchedPhones.push({
        phone: phoneRecord.phone,
        message: phoneRecord.last_message,
        date: phoneRecord.last_date,
        group_name: phoneRecord.group_name,
        group_id: phoneRecord.group_id
      });
    });
    
    if (matchedPhones.length > 0) {
      districtResults.push({
        district_name: cityName,
        district_name_uz: city.name.charAt(0).toUpperCase() + city.name.slice(1),
        phone_count: matchedPhones.length,
        phones: matchedPhones,
        messages: matchedPhones // For compatibility
      });
    }
  }
  
  // Sort by phone count
  districtResults.sort((a, b) => b.phone_count - a.phone_count);
  
  return districtResults;
}

module.exports = {
  findMessagesByDistricts
};
