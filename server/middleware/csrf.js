// ================================================================
//  CSRF Protection Middleware (#6)
//  Double Submit Cookie Pattern สำหรับ API
// ================================================================
const crypto = require('crypto');

/**
 * Generate CSRF Token
 * ส่ง token กลับ client ใน cookie + response header
 * Client ต้องส่ง token กลับมาใน X-CSRF-Token header
 */
const generateCsrf = (req, res, next) => {
    // สร้าง token ใหม่ถ้ายังไม่มี
    if (!req.cookies?.csrfToken) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', token, {
            httpOnly: false,  // ต้อง false เพื่อให้ JS อ่านได้
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        res.setHeader('X-CSRF-Token', token);
    }
    next();
};

/**
 * Verify CSRF Token
 * ใช้กับ POST/PUT/DELETE routes ที่ต้องการ CSRF protection
 * ข้าม verify สำหรับ:
 * - API calls ที่ใช้ Bearer token (JWT) — เพราะ CSRF ไม่มีผลกับ header-based auth
 * - File uploads
 * - OAuth callbacks
 */
const verifyCsrf = (req, res, next) => {
    // ข้ามสำหรับ safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

    // ข้ามถ้าใช้ Bearer token (JWT-based auth ไม่เสี่ยง CSRF)
    if (req.header('Authorization')?.startsWith('Bearer ')) return next();

    // ข้ามสำหรับ OAuth callbacks
    if (req.path.includes('/callback')) return next();

    // ตรวจ CSRF token
    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.header('X-CSRF-Token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
            success: false,
            msg: 'CSRF Token ไม่ถูกต้อง กรุณาลองใหม่',
        });
    }

    // Regenerate CSRF token หลังใช้งาน เพื่อป้องกัน Token Fixation
    const newToken = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
    });
    res.setHeader('X-CSRF-Token', newToken);

    next();
};

module.exports = { generateCsrf, verifyCsrf };
