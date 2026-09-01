const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['topup', 'purchase', 'refund', 'admin_add', 'admin_deduct'], required: true },
    amount: { type: Number, required: true },                // positive = add, negative = deduct
    method: { type: String, default: '' },                   // promptpay, truemoney, bank, admin
    orderId: { type: String, default: '' },                   // linked order if purchase
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'success' },
    note: { type: String, default: '' },
    // Payment verification
    slipRef: { type: String, default: '' },              // payment slip reference
    slipImage: { type: String, default: '' },            // uploaded slip image path
    trueMoneyLink: { type: String, default: '' },              // TrueMoney gift link
    // Admin approval tracking
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
