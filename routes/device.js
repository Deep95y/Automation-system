const express = require('express');
const router = express.Router();
const PunchLog = require('../models/PunchLog');
const { validatePunchPayload } = require('../utils/validators');
const forwarder = require('../services/forwarder');

const DUP_WINDOW_SECONDS = parseInt(process.env.DUPLICATE_WINDOW_SECONDS || '60');

router.post('/punch', async (req, res) => {
  try {
    const validate = validatePunchPayload(req.body);
    if(!validate.ok) return res.status(400).json({ error: validate.error });

    const { userId, deviceId, punchTime, type } = validate.data;

    // Duplicate check: if a punch for same user exists within DUP_WINDOW_SECONDS before this punchTime
    const cutoff = new Date(punchTime.getTime() - DUP_WINDOW_SECONDS*1000);
    const recent = await PunchLog.findOne({
      userId,
      punchTime: { $gte: cutoff }
    }).sort({ punchTime: -1 });

    if(recent) {
      return res.status(409).json({ error: `Duplicate punch within ${DUP_WINDOW_SECONDS} seconds` });
    }

    // Save pending log
    const log = new PunchLog({
      userId, deviceId, punchTime, type, status: 'pending'
    });
    await log.save();

    // Async forward to CRM; errors will be handled inside forwarder
    forwarder.sendToCRM(log).catch(err => {
      console.error('Forwarder error (fire-and-forget)', err.message || err);
    });

    return res.status(201).json({ message: 'Punch recorded', id: log._id });
  } catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /device/punches - List all punch logs with pagination and filters
router.get('/punches', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build query filters
    const query = {};
    if (req.query.userId) query.userId = req.query.userId;
    if (req.query.deviceId) query.deviceId = req.query.deviceId;
    if (req.query.status) query.status = req.query.status;
    if (req.query.type) query.type = req.query.type;
    
    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.punchTime = {};
      if (req.query.startDate) query.punchTime.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.punchTime.$lte = new Date(req.query.endDate);
    }

    const logs = await PunchLog.find(query)
      .sort({ punchTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await PunchLog.countDocuments(query);

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
