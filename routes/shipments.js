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

// Request a full or partial shipment
router.post('/', ensureAuth, requestShipment);

// List all loads assigned to current user
router.get('/', ensureAuth, async (req, res) => {
  try {
    const loads = await Shipment.find({ assignedTo: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(loads);
  } catch (err) {
    console.error('[GET /api/shipments] error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get details for a single load
router.get('/:id', ensureAuth, async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id).lean();
    if (!s || s.assignedTo.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Not found' });
    }
    res.json(s);
  } catch (err) {
    console.error(`[GET /api/shipments/${req.params.id}] error:`, err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Accept an offer
router.put('/:id/accept', ensureAuth, acceptShipment);

// Update shipment status (loading → in-transit → delivered)
router.put('/:id/status', ensureAuth, updateStatus);

// Cancel a shipment
router.delete('/:id', ensureAuth, cancelShipment);

module.exports = router;
