/**
 * ROUTE MESSAGES AUTOMATIC CLEANUP
 * 2 soatdan eski elonlarni avtomatik ochirish
 */

const { query } = require('../database/sqlite');
const logger = require('../utils/logger');

/**
 * 2 soatdan eski elonlarni ochirish
 */
async function cleanupOldRouteMessages() {
  try {
    // 2 soat oldin
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // 2 soatdan eski elonlarni ochirish
    const result = await query(
      'DELETE FROM route_messages WHERE message_date < ?',
      [twoHoursAgo]
    );

    const deletedCount = result.changes || 0;

    if (deletedCount > 0) {
      logger.info(`🗑️  Route Cleanup: ${deletedCount} ta eski elon ochirildi (2 soatdan eski)`);
    }

    return deletedCount;
  } catch (error) {
    logger.error('Route cleanup xatosi:', error);
    return 0;
  }
}

/**
 * Cleanup ni boshlash (har 10 daqiqada)
 */
function startRouteCleanup() {
  // Darhol birinchi cleanup
  cleanupOldRouteMessages();

  // Har 10 daqiqada cleanup
  const intervalMs = 10 * 60 * 1000; // 10 daqiqa
  setInterval(async () => {
    await cleanupOldRouteMessages();
  }, intervalMs);

  logger.info('✓ Route cleanup boshlandi (har 10 daqiqada, 2 soatdan eski elonlar ochiriladi)');
}

module.exports = {
  cleanupOldRouteMessages,
  startRouteCleanup
};
