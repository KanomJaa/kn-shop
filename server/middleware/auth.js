const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// ==================== ACCESS TOKEN (short-lived) ====================
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m', // 15 minutes default
    });
};

// ==================== REFRESH TOKEN (long-lived, httpOnly cookie) ====================
const generateRefreshToken = (userId, tokenVersion = 0) => {
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    return jwt.sign({ id: userId, type: 'refresh', tokenVersion }, secret, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES || '7d', // 7 days default
    });
};

// Set refresh token as httpOnly cookie
const setRefreshCookie = (res, refreshToken) => {
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth',
    });
};

// Clear refresh token cookie
const clearRefreshCookie = (res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
    });
};

// ==================== AUTH MIDDLEWARE ====================
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, msg: 'กรุณาเข้าสู่ระบบ' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) return res.status(401).json({ success: false, msg: 'ไม่พบผู้ใช้' });
        if (user.isBanned) return res.status(403).json({ success: false, msg: `บัญชีถูกระงับ: ${user.banReason || 'ติดต่อแอดมิน'}` });

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, msg: 'Token หมดอายุ กรุณา refresh', code: 'TOKEN_EXPIRED' });
        }
        res.status(401).json({ success: false, msg: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
};

// ==================== ADMIN AUTH MIDDLEWARE ====================
const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) return res.status(401).json({ success: false, msg: 'กรุณาเข้าสู่ระบบ' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'admin') return res.status(403).json({ success: false, msg: 'ไม่มีสิทธิ์เข้าถึง' });
        if (user.isBanned) return res.status(403).json({ success: false, msg: `บัญชีถูกระงับ: ${user.banReason || 'ติดต่อแอดมิน'}` });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ success: false, msg: 'Token ไม่ถูกต้อง' });
    }
};

module.exports = {
    auth,
    adminAuth,
    generateToken,
    generateRefreshToken,
    setRefreshCookie,
    clearRefreshCookie,
};
