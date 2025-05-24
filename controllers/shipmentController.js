const Shipment = require('../models/shipment');
const User     = require('../models/user');

//Federal weight limits by vehicle length
const LENGTH_LIMITS = {
  14: 3500,
  16: 4000,
  20: 4500,
  26: 12000
};

exports.requestShipment = async (req, res) => {
  try {
    const vehicleLength     = Number(req.body.vehicleLength);
    const currentLoadLength = Number(req.body.currentLoadLength) || 0;
    const currentLoadWeight = Number(req.body.currentLoadWeight) || 0;
    const requestType       = req.body.requestType === 'partial' ? 'partial' : 'full';

    const maxW = LENGTH_LIMITS[vehicleLength];
    if (!maxW) {
      return res.status(400).json({ msg: 'Invalid vehicle length' });
    }

    if (requestType === 'partial') {
      if (currentLoadLength >= vehicleLength) {
        return res.status(400).json({ msg: 'Current load length must be less than vehicle length' });
      }
      if (currentLoadWeight >= maxW) {
        return res.status(400).json({ msg: 'Current load weight must be less than vehicle max weight' });
      }
    }

    const match = { status: 'available' };
    if (requestType === 'partial') {
      match.loadLength = { $lte: vehicleLength - currentLoadLength };
      match.loadWeight = { $lte: maxW - currentLoadWeight };
    } else {
      match.loadLength = { $lte: vehicleLength };
      match.loadWeight = { $lte: maxW };
    }

    const [shipment] = await Shipment.aggregate([
      { $match: match },
      { $sample: { size: 1 } }
    ]);

    if (!shipment) {
      return res.status(404).json({ msg: 'No shipment matches your criteria' });
    }
    return res.json(shipment);

  } catch (err) {
    console.error('requestShipment error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.acceptShipment = async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id);
    if (!s || s.status !== 'available') {
      return res.status(400).json({ msg: 'Shipment not available' });
    }
    s.assignedTo = req.user.id;
    s.status     = 'assigned';
    await s.save();
    return res.json(s);
  } catch (err) {
    console.error('acceptShipment error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const s = await Shipment.findById(req.params.id);
    if (!s || s.assignedTo.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Not found' });
    }

    const valid = ['loading','in-transit','delivered'];
    if (!valid.includes(req.body.status)) {
      return res.status(400).json({ msg: 'Invalid status' });
    }

    s.status = req.body.status;
    await s.save();

    let newBalance = null;
    if (req.body.status === 'delivered') {
      const payout = s.distance * s.rate;
      req.user.balance = (req.user.balance || 0) + payout;
      await req.user.save();
      newBalance = req.user.balance;
    }

    return res.json({
      shipment: s.toObject(),
      balance:  newBalance
    });
  } catch (err) {
    console.error('updateStatus error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

exports.cancelShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      _id: req.params.id,
      assignedTo: req.user.id,
      status: { $in: ['assigned','loading'] }
    });
    if (!shipment) {
      return res.status(404).json({ msg: 'Cannot cancel' });
    }
    await shipment.deleteOne();
    return res.json({ ok: true });
  } catch (err) {
    console.error('cancelShipment error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};
