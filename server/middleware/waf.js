// ================================================================
//  WAF (Web Application Firewall) Middleware
//  กรองข้อมูลอันตราย (SQL Injection, XSS, NoSQL Injection)
// ================================================================

/**
 * Check if value contains suspicious patterns
 * @returns {string|null} Attack type or null
 */
function detectAttack(value) {
    if (typeof value !== 'string') return null;

    // SQL Injection patterns
    const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|alter|create|exec|execute)\b.*\b(from|into|table|database|where)\b)/i,
        /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
        /(\b(xp_|sp_)\w+)/i,
        /(;\s*(drop|delete|update|insert)\b)/i,
        // SQL comments: ต้องมี space ก่อน -- เพื่อไม่ block text ทั่วไปเช่น "ราคาดี--แนะนำ"
        /(\s--|^--).*$/m,
        /(\/\*[\s\S]*?\*\/)/,
    ];

    for (const pattern of sqlPatterns) {
        if (pattern.test(value)) return 'SQL Injection';
    }

    // XSS patterns — ใช้ pattern ที่เจาะจงมากขึ้นเพื่อลด false positive
    const xssPatterns = [
        /<script\b[^>]*>[\s\S]*?<\/script>/gi,
        /javascript\s*:/i,
        // ตรวจเฉพาะ HTML event handler (ต้องมี < tag ก่อน) เพื่อไม่ block คำธรรมดาเช่น "one=", "online="
        /<[^>]+\bon\w+\s*=\s*["']?[^"']*["']?/i,
        /(<\s*iframe|<\s*embed|<\s*object|<\s*applet)/i,
        /(<\s*img[^>]+onerror)/i,
        /(document\.(cookie|domain|write)|window\.(location|open))/i,
        /eval\s*\(/i,
    ];

    for (const pattern of xssPatterns) {
        if (pattern.test(value)) return 'XSS';
    }

    // Path Traversal
    if (/\.\.[\\/]/.test(value)) return 'Path Traversal';

    // NoSQL Injection ($ operator in string — caught by express-mongo-sanitize too)
    const lowerVal = value.toLowerCase();
    if (/\$(?:gt|gte|lt|lte|ne|in|nin|regex|where|or|and|not|nor|exists|type|mod|all|size|elemMatch)\b/.test(lowerVal)) {
        return 'NoSQL Injection';
    }

    return null;
}

/**
 * Deep check all values in an object
 */
function deepCheck(obj, path = '') {
    if (!obj || typeof obj !== 'object') {
        const attack = detectAttack(obj);
        if (attack) return { path, attack, value: String(obj).substring(0, 100) };
        return null;
    }

    for (const key of Object.keys(obj)) {
        const result = deepCheck(obj[key], path ? `${path}.${key}` : key);
        if (result) return result;
    }
    return null;
}

/**
 * WAF Middleware
 */
function wafMiddleware(req, res, next) {
    // Check body, query, and params
    const sources = [
        { name: 'body', data: req.body },
        { name: 'query', data: req.query },
        { name: 'params', data: req.params },
    ];

    for (const source of sources) {
        if (!source.data) continue;
        const result = deepCheck(source.data);
        if (result) {
            console.warn(`🛡️ WAF BLOCKED: ${result.attack} in ${source.name}.${result.path} from IP: ${req.ip}`);

            // Log the suspicious activity
            const ActionLog = require('../models/ActionLog');
            ActionLog.create({
                action: 'suspicious_input',
                details: `WAF blocked ${result.attack} attempt`,
                metadata: {
                    source: source.name,
                    field: result.path,
                    attackType: result.attack,
                    valuePreview: result.value,
                },
                ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
                userAgent: req.headers['user-agent'] || '',
                success: false,
                errorMessage: `Blocked ${result.attack} attack`,
            }).catch(() => { });

            return res.status(403).json({
                success: false,
                msg: 'คำขอถูกบล็อกเนื่องจากตรวจพบข้อมูลที่ไม่ปลอดภัย',
            });
        }
    }

    next();
}

module.exports = wafMiddleware;
