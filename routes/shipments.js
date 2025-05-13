const express = require('express');
const {
  requestShipment,
  acceptShipment,
  updateStatus,
  cancelShipment
} = require('../controllers/shipmentController');
const { ensureAuth } = require('./utils');
const Shipment       = require('../models/shipment');

const router = express.Router();
console.log('🚧 [shipments.js] Handlers:', {
  requestShipment: typeof requestShipment,
  acceptShipment:  typeof acceptShipment,
  updateStatus:    typeof updateStatus,
  cancelShipment:  typeof cancelShipment
});

// POST /api/shipments/request
router.post('/request', ensureAuth, requestShipment);

// PUT /api/shipments/:id/accept
router.put('/:id/accept', ensureAuth, acceptShipment);

// PUT /api/shipments/:id/status
router.put('/:id/status', ensureAuth, updateStatus);

// DELETE /api/shipments/:id
router.delete('/:id', ensureAuth, cancelShipment);

// GET /api/shipments
router.get('/', ensureAuth, async (req, res) => {
  try {
    const list = await Shipment
      .find({ assignedTo: req.user.id })
      .sort('createdAt');
    res.json(list);
  } catch (err) {
    console.error('[GET /api/shipments] error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/shipments/:
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id);
    if (!s || s.assignedTo.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Not found' });
    }
    res.json(s);
  } catch (err) {
    console.error(`[GET /api/shipments/${req.params.id}] error:`, err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
