const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const passport = require('passport');
const wafMiddleware = require('./middleware/waf');
const { generateCsrf, verifyCsrf } = require('./middleware/csrf');
const { setupSwagger } = require('./config/swagger');

const app = express();

// Configure proxy handling before anything reads req.ip (rate limits, logs, WAF).
if (process.env.TRUST_PROXY) {
    app.set('trust proxy', 1);
}

// ==================== SECURITY MIDDLEWARE ====================

// 1. Helmet — HTTP Security Headers
app.use(helmet({
    contentSecurityPolicy: false,  // ปิดเพราะใช้ inline scripts/styles
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,       // 1 year
        includeSubDomains: true,
        preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// 2. CORS — same-origin by default; optional comma-separated allowlist.
const allowedOrigins = (process.env.CORS_ORIGIN || process.env.BASE_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        const error = new Error('Origin not allowed by CORS');
        error.status = 403;
        return callback(error);
    },
    credentials: true,
}));

// 3. Request Logger (Morgan)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// 4. Body Parser + Cookie Parser
app.use(express.json({
    limit: '10mb',
    verify(req, res, buffer) {
        if (req.path === '/webhook/line') req.rawBody = Buffer.from(buffer);
    },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Third-party webhooks use provider signatures instead of browser CSRF tokens.
app.use('/webhook', require('./routes/webhooks'));

// 5. NoSQL Injection Prevention — ลบ $ และ . จาก req.body/query/params
app.use(mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
        console.warn(`🛡️ Mongo sanitize removed: ${key} from ${req.ip}`);
    },
}));

// 6. HTTP Parameter Pollution Prevention
app.use(hpp());

// 7. WAF — Web Application Firewall
app.use('/api/', wafMiddleware);

// 8. Rate Limiting — General API
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,  // 1 minute
    max: 100,
    message: { success: false, msg: 'คำขอมากเกินไป กรุณารอสักครู่' },
    standardHeaders: true,
    legacyHeaders: false,
    // Trust Cloudflare proxy
    ...(process.env.TRUST_PROXY && { keyGenerator: (req) => req.headers['cf-connecting-ip'] || req.ip }),
});
app.use('/api/', limiter);

// 9. Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { success: false, msg: 'พยายามล็อกอินมากเกินไป กรุณารอ 1 นาที' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);

// 10. OTP-specific rate limit (stricter)
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,   // 10 minutes
    max: 5,
    message: { success: false, msg: 'ส่ง OTP มากเกินไป กรุณารอ 10 นาที' },
});
app.use('/api/auth/forgot-password', otpLimiter);

// 11. Passport (Google/Facebook OAuth)
require('./config/passport');
app.use(passport.initialize());

// 12. CSRF Protection (#6) — generate token on every request
app.use(generateCsrf);
app.use(verifyCsrf);

// 13. Swagger API Docs (#10)
setupSwagger(app);

// ==================== STATIC FILES ====================
// Serve only public frontend folders. Never expose server source/config files.
app.use('/css', express.static(path.join(__dirname, '..', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'js')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api', require('./routes/system'));

// Unknown API routes must return JSON, not the frontend HTML shell.
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, msg: 'ไม่พบ API endpoint' });
});

// ==================== FALLBACK ====================
app.get('*', (req, res) => {
    // Unknown asset-like paths should be a real 404, not a misleading HTML response.
    if (path.extname(req.path)) {
        return res.status(404).type('text').send('Not found');
    }
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('Unhandled request error:', err.message);
    if (res.headersSent) return next(err);
    return res.status(err.status || 500).json({
        success: false,
        msg: err.status === 403 ? 'Origin ไม่ได้รับอนุญาต' : 'เกิดข้อผิดพลาด',
    });
});

module.exports = app;
