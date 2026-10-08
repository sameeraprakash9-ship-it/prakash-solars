const cron = require('node-cron');
const { createCurrentPriceSnapshot } = require('../services/pricingService');

const startPricingJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const snapshot = await createCurrentPriceSnapshot();
      console.log(`Scheduled price snapshot created: ${snapshot._id}`);
    } catch (error) {
      console.error('Failed to create scheduled price snapshot:', error);
    }
  });
};

module.exports = startPricingJob;
