const Shipment = require('../models/shipment');
const User     = require('../models/user');

// Federal weight limits by vehicle length
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
    if (!maxW) return res.status(400).json({ msg: 'Invalid vehicle length' });

    // Build filter
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
    const shipment = await Shipment.findOneAndUpdate(
      { _id: req.params.id, status: 'available' },
      { status: 'assigned', assignedTo: req.user.id },
      { new: true }
    );
    if (!shipment) {
      return res.status(409).json({ msg: 'Shipment already taken' });
    }
    return res.json(shipment);

  } catch (err) {
    console.error('acceptShipment error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    //Atomically update shipment status
    const shipment = await Shipment.findOneAndUpdate(
      { _id: req.params.id, assignedTo: req.user.id },
      { status },
      { new: true }
    );
    if (!shipment) {
      return res.status(404).json({ msg: 'Shipment not found' });
    }

    //Start with whatever balance the session user has
    let newBalance = Number(req.user.balance) || 0;

    //If delivered, compute pay and update user
    if (status === 'delivered') {
      const totalPay = shipment.rate * shipment.distance;
      // Increment in the database and get updated doc
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $inc: { balance: totalPay } },
        { new: true, select: 'balance' }
      );
      // Ensure we treat balance as a Number
      newBalance = Number(updatedUser.balance) || 0;
      // Sync session user
      req.user.balance = newBalance;
    }

    // Always return explicit numeric balance
    return res.json({ ok: true, balance: newBalance });

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
      status: { $in: ['assigned', 'loading'] }
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
