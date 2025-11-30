const mongoose = require('mongoose');

const PunchLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  punchTime: { type: Date, required: true, index: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  lastError: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('PunchLog', PunchLogSchema);
