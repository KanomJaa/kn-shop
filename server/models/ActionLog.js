const mongoose = require('mongoose');

const actionLogSchema = new mongoose.Schema({
    // Who
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    username: { type: String, default: 'system' },
    role: { type: String, default: 'member' },

    // What
    action: {
        type: String,
        required: true,
        enum: [
            // Auth actions
            'register', 'login', 'login_failed', 'logout',
            'password_change', 'password_reset_request', 'password_reset_otp_verify', 'password_reset_complete',
            'social_login_google', 'social_login_facebook',
            // User actions
            'profile_update', 'topup', 'topup_request', 'purchase', 'checkout',
            // Admin actions
            'admin_add_points', 'admin_deduct_points', 'admin_ban_user', 'admin_unban_user',
            'admin_update_order', 'admin_refund_order',
            'admin_create_product', 'admin_update_product', 'admin_delete_product',
            'admin_create_category', 'admin_update_category', 'admin_delete_category',
            'topup_approve', 'topup_reject',
            // Security events
            'rate_limit_hit', 'suspicious_input', 'token_expired', 'unauthorized_access',
        ]
    },

    // Details
    details: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Where
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },

    // Result
    success: { type: Boolean, default: true },
    errorMessage: { type: String, default: '' },
}, { timestamps: true });

// Indexes for fast query
actionLogSchema.index({ userId: 1, createdAt: -1 });
actionLogSchema.index({ action: 1, createdAt: -1 });
actionLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActionLog', actionLogSchema);
