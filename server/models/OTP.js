const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true },
    code: { type: String, required: true },
    purpose: { type: String, enum: ['password_reset', 'reset_verified', 'email_verify'], default: 'password_reset' },
    attempts: { type: Number, default: 0 },       // Track failed verification attempts
    maxAttempts: { type: Number, default: 5 },     // Max allowed attempts
    isUsed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Auto-delete expired OTPs after 1 hour
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });
otpSchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model('OTP', otpSchema);
