const express = require('express');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        version: '1.1.0',
        memoryUsage: {
            rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        },
    });
});

// Operational details are useful to admins but should not be exposed publicly.
router.get('/security-info', adminAuth, (req, res) => {
    res.json({
        success: true,
        security: {
            passwordHashing: 'bcrypt (12 rounds)',
            authentication: 'JWT Access Token (15m) + Refresh Token (7d httpOnly cookie)',
            inputValidation: 'express-validator',
            rateLimiting: 'API and user-scoped limits',
            headers: 'Helmet.js',
            csrf: 'Double Submit Cookie pattern',
            waf: 'Active',
            mongoSanitize: 'Active',
            socialLogin: {
                google: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured',
                facebook: process.env.FACEBOOK_APP_ID ? 'Configured' : 'Not configured',
            },
            apiDocs: '/api-docs',
        },
    });
});

module.exports = router;
