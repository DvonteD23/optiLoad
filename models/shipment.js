const mongoose = require('mongoose');
const { Schema } = mongoose;

const shipmentSchema = new Schema({
  loadLength:      { type: Number, required: true },
  loadWeight:      { type: Number, required: true },
  distance:        { type: Number, required: true },
  commodity:       { type: String, required: true },
  rate:            { type: Number, required: true },
  shippingCompany: { type: String, required: true },

  city:  { type: String, required: true },
  state: { type: String, required: true },

  status: {
    type: String,
    enum: [
      'available',    // can be requested
      'assigned',     // ← added back here
      'loading',
      'in-transit',
      'delivered'
    ],
    default: 'available'
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt:  { type: Date, default: Date.now }
}, {
  collection: 'shipments'
});

module.exports = mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema);
