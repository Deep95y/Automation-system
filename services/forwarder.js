const axios = require('axios');
const PunchLog = require('../models/PunchLog');

const CRM_URL = process.env.CRM_URL || 'http://localhost:3000/crm/attendance/punch';

async function sendToCRM(punchLog) {
  try {
    const payload = {
      deviceId: punchLog.deviceId,
      userId: punchLog.userId,
      timestamp: punchLog.punchTime.toISOString(),
      type: punchLog.type
    };

    const res = await axios.post(CRM_URL, payload, { timeout: 5000 });

    if (res.status >= 200 && res.status < 300) {
      punchLog.status = 'synced';
      punchLog.retryCount = 0;
      punchLog.lastError = null;
      await punchLog.save();
    } else {
      punchLog.status = 'failed';
      punchLog.lastError = `HTTP ${res.status}`;
      await punchLog.save();
    }
  } catch (err) {
    // network or CRM error
    punchLog.status = 'failed';
    punchLog.lastError = err.message;
    // do not increment retryCount here; retry worker increments before retry attempts
    await punchLog.save();
  }
}

module.exports = { sendToCRM };
