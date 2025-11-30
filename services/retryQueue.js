const PunchLog = require('../models/PunchLog');
const forwarder = require('./forwarder');

const RETRY_INTERVAL_MS = parseInt(process.env.RETRY_INTERVAL_MS || '10000');
const RETRY_LIMIT = parseInt(process.env.RETRY_LIMIT || '3');

let intervalHandle = null;

function startRetryWorker(){
  if(intervalHandle) return;
  intervalHandle = setInterval(async () => {
    try {
      // Find failed logs that have retryCount < RETRY_LIMIT
      const failed = await PunchLog.find({ status: 'failed', retryCount: { $lt: RETRY_LIMIT } }).limit(20).sort({ updatedAt: 1 });
      for(const log of failed){
        // increment retryCount to avoid parallel retries
        log.retryCount = (log.retryCount || 0) + 1;
        await log.save();

        try {
          await forwarder.sendToCRM(log);
        } catch(e) {
          console.error('Retry attempt failed for', log._id, e.message || e);
        }
      }
    } catch(e) {
      console.error('Retry worker error', e.message || e);
    }
  }, RETRY_INTERVAL_MS);
  console.log('Retry worker started, interval', RETRY_INTERVAL_MS, 'ms');
}

function stopRetryWorker(){
  if(intervalHandle) clearInterval(intervalHandle);
}

module.exports = { startRetryWorker, stopRetryWorker };
