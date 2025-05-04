    module.exports = (mongoose) => {
     const loadSchema = new mongoose.Schema({
       carrier       : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
       reference     : { type: String,  required: true, trim: true },
       origin        : { type: String,  required: true },
       destination   : { type: String,  required: true },
       pickupDate    : { type: Date,    required: true },
       deliveryDate  : { type: Date,    required: true },
       equipmentType : { type: String },
       rate          : { type: Number },
       status        : { type: String, enum: ['Tendered','In‑Transit','Delivered','Cancelled'], default: 'Tendered' },
     }, { timestamps: true });

     return mongoose.models.Load || mongoose.model('Load', loadSchema);
   };