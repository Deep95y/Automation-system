// Simple validator and normalizer
const simpleUserRegex = /^EMP\d+$/i; // accepts EMP102 etc.

function validatePunchPayload(payload){
  const { deviceId, userId, timestamp, type } = payload || {};
  if(!deviceId || !userId || !timestamp || !type) {
    return { ok:false, error: 'Missing required fields (deviceId, userId, timestamp, type)' };
  }

  if(!simpleUserRegex.test(String(userId))) {
    return { ok:false, error: 'Invalid userId format. Expected EMP<digits> like EMP102' };
  }

  const date = new Date(timestamp);
  if(isNaN(date.getTime())) return { ok:false, error: 'Invalid timestamp' };

  const t = String(type).trim().toUpperCase();
  if(t !== 'IN' && t !== 'OUT') return { ok:false, error: 'Invalid type. Use IN or OUT' };

  return { ok:true, data:{
    deviceId: String(deviceId),
    userId: String(userId).toUpperCase(),
    punchTime: date,
    type: t
  }};
}

module.exports = { validatePunchPayload };
