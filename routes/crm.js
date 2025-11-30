// Simulated CRM endpoint to receive punches.
// Use ?fail=1 or set CRM_ALWAYS_FAIL=1 to simulate errors.
const express = require('express');
const router = express.Router();

router.post('/attendance/punch', (req, res) => {
  const fail = req.query.fail === '1' || process.env.CRM_ALWAYS_FAIL === '1';

  if(!req.body || !req.body.userId) {
    return res.status(400).json({ error: 'bad payload' });
  }

  if(fail) {
    return res.status(500).json({ error: 'Simulated CRM error' });
  }

  // Simulate small processing delay
  return res.status(200).json({ message: 'OK', received: req.body });
});

module.exports = router;
