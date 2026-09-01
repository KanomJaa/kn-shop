const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    robloxUsername: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, unique: true },                 // KN1234567890
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    items: [orderItemSchema],
    totalPoints: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
    queueNumber: { type: Number, default: 0 },
    refunded: { type: Boolean, default: false },
    statusNote: { type: String, default: '' },                  // reason for failure/refund
    completedAt: { type: Date, default: null },
}, { timestamps: true });

// Auto-generate orderId with random suffix to prevent collisions
orderSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = 'KN' + Date.now() + Math.random().toString(36).substr(2, 4).toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
