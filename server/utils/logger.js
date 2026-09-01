// ================================================================
//  Action Logger Utility
//  บันทึกทุกกิจกรรมในระบบเพื่อความปลอดภัยและตรวจสอบย้อนหลัง
// ================================================================

const ActionLog = require('../models/ActionLog');

/**
 * Log an action to the database
 * @param {Object} options
 * @param {Object} options.req - Express request object (optional, for IP/userAgent)
 * @param {Object} options.user - User object or { _id, username, role }
 * @param {string} options.action - Action type (see ActionLog model enum)
 * @param {string} options.details - Human-readable description
 * @param {Object} options.metadata - Extra structured data
 * @param {boolean} options.success - Whether action succeeded
 * @param {string} options.errorMessage - Error message if failed
 */
async function logAction({ req, user, action, details = '', metadata = {}, success = true, errorMessage = '' }) {
    try {
        // Extract IP from request (support Cloudflare proxy)
        let ip = '';
        let userAgent = '';
        if (req) {
            ip = req.headers['cf-connecting-ip']       // Cloudflare
                || req.headers['x-real-ip']            // Nginx proxy
                || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.ip
                || req.connection?.remoteAddress
                || '';
            userAgent = req.headers['user-agent'] || '';
        }

        await ActionLog.create({
            userId: user?._id || user?.id || null,
            username: user?.username || 'system',
            role: user?.role || 'guest',
            action,
            details,
            metadata,
            ip,
            userAgent: userAgent.substring(0, 500), // Limit length
            success,
            errorMessage,
        });
    } catch (err) {
        // Never let logging errors break the app
        console.error('⚠️ Action log error:', err.message);
    }
}

module.exports = { logAction };
