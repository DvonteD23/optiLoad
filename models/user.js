const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name:           String,
  email:          { type: String, required: true, unique: true },
  password:       { type: String, required: true },
  company:        String,
  vehicleType:    String,
  vehicleLength:  Number,
  balance:        { type: Number, default: 0 }
});

module.exports = mongoose.model('User', userSchema);
