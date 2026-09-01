// ================================================================
//  User-based Rate Limiting (#7)
//  Rate limit ตาม userId + IP ร่วมกัน
// ================================================================

/**
 * In-memory store สำหรับ user rate limiting
 * Production ควรใช้ Redis (#8)
 */
const userRateLimits = new Map();

// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of userRateLimits.entries()) {
        if (now > data.resetAt) {
            userRateLimits.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * สร้าง rate limiter ต่อ user
 * @param {Object} options
 * @param {number} options.maxRequests - จำนวน request สูงสุด
 * @param {number} options.windowMs - ช่วงเวลา (ms)
 * @param {string} options.message - ข้อความ error
 */
function userRateLimit({ maxRequests = 10, windowMs = 60 * 1000, message = 'คำขอมากเกินไป กรุณารอสักครู่' } = {}) {
    return (req, res, next) => {
        // ถ้ายังไม่ได้ login ใช้ IP-based rate limit ปกติ (ข้าม)
        if (!req.user) return next();

        const key = `${req.user._id}:${req.path}`;
        const now = Date.now();

        let entry = userRateLimits.get(key);

        if (!entry || now > entry.resetAt) {
            entry = {
                count: 1,
                resetAt: now + windowMs,
            };
            userRateLimits.set(key, entry);
            return next();
        }

        entry.count++;

        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', retryAfter);
            return res.status(429).json({
                success: false,
                msg: message,
                retryAfter,
            });
        }

        next();
    };
}

// ==================== Pre-configured limiters ====================

// Checkout: max 5 ครั้ง / นาที ต่อ user
const checkoutLimiter = userRateLimit({
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: 'สั่งซื้อเร็วเกินไป กรุณารอ 1 นาที',
});

// Topup: max 5 ครั้ง / 5 นาที ต่อ user
const topupLimiter = userRateLimit({
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    message: 'ส่งคำขอเติมเงินเร็วเกินไป กรุณารอ 5 นาที',
});

// Profile update: max 10 ครั้ง / นาที ต่อ user
const profileLimiter = userRateLimit({
    maxRequests: 10,
    windowMs: 60 * 1000,
    message: 'แก้ไขโปรไฟล์เร็วเกินไป',
});

module.exports = {
    userRateLimit,
    checkoutLimiter,
    topupLimiter,
    profileLimiter,
};
