const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { auth, generateToken, generateRefreshToken, setRefreshCookie, clearRefreshCookie } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { sendOTPEmail, sendVerifyEmail } = require('../utils/email');
const {
    validate, registerRules, loginRules, changePasswordRules,
    forgotPasswordRules, verifyOtpRules, resetPasswordRules,
} = require('../middleware/validate');
const { notifyNewUser } = require('../utils/line');
const { profileLimiter } = require('../middleware/userRateLimit');

// OAuth strategies are registered only when both credentials are available.
// Keep these routes graceful on deployments that have not configured OAuth yet;
// otherwise Passport throws "Unknown authentication strategy" and Express
// responds with an unhelpful Internal Server Error.
const oauthConfigured = {
    google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
};

const oauthUnavailable = (provider) => (req, res) => {
    res.redirect(`/pages/login.html?error=${provider}_unavailable`);
};

// ==================== REGISTER ====================
router.post('/register', registerRules, validate, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check existing
        if (await User.findOne({ email })) return res.status(400).json({ success: false, msg: 'อีเมลนี้ถูกใช้แล้ว' });
        if (await User.findOne({ username })) return res.status(400).json({ success: false, msg: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' });

        // Generate email verification token
        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const user = await User.create({
            username, email, password,
            emailVerifyToken,
            emailVerifyExpires,
        });

        const accessToken = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id, user.tokenVersion);
        setRefreshCookie(res, refreshToken);

        // Send verification email (non-blocking)
        sendVerifyEmail(email, emailVerifyToken, username).catch(err => {
            console.error('Failed to send verify email:', err.message);
        });

        // แจ้งเตือน Line (non-blocking)
        notifyNewUser(username, email).catch(() => {});

        await logAction({
            req, user,
            action: 'register',
            details: `ผู้ใช้ "${username}" สมัครสมาชิกสำเร็จ`,
            metadata: { email },
        });

        res.status(201).json({
            success: true,
            msg: 'สมัครสมาชิกสำเร็จ! กรุณายืนยันอีเมล',
            token: accessToken,
            user,
        });
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== VERIFY EMAIL (#5) ====================
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ success: false, msg: 'ไม่พบ token' });

        const user = await User.findOne({
            emailVerifyToken: token,
            emailVerifyExpires: { $gt: new Date() },
        });

        if (!user) {
            return res.redirect('/pages/login.html?error=verify_expired');
        }

        user.emailVerified = true;
        user.emailVerifyToken = null;
        user.emailVerifyExpires = null;
        await user.save();

        await logAction({
            req, user,
            action: 'register',
            details: `${user.email} ยืนยันอีเมลสำเร็จ`,
        });

        res.redirect('/pages/login.html?verified=true');
    } catch (err) {
        console.error('Email verify error:', err.message);
        res.redirect('/pages/login.html?error=verify_failed');
    }
});

// ==================== RESEND VERIFICATION EMAIL ====================
router.post('/resend-verify', auth, async (req, res) => {
    try {
        if (req.user.emailVerified) {
            return res.json({ success: true, msg: 'อีเมลยืนยันแล้ว' });
        }

        const emailVerifyToken = crypto.randomBytes(32).toString('hex');
        req.user.emailVerifyToken = emailVerifyToken;
        req.user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await req.user.save();

        await sendVerifyEmail(req.user.email, emailVerifyToken, req.user.username);
        res.json({ success: true, msg: 'ส่งอีเมลยืนยันอีกครั้งแล้ว' });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== LOGIN ====================
router.post('/login', loginRules, validate, async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body;

        const user = await User.findOne({
            $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
        });
        if (!user) {
            await logAction({ req, user: { username: emailOrUsername }, action: 'login_failed', details: 'ไม่พบบัญชีผู้ใช้', success: false });
            return res.status(401).json({ success: false, msg: 'ไม่พบบัญชีผู้ใช้นี้' });
        }
        if (user.isBanned) {
            await logAction({ req, user, action: 'login_failed', details: 'บัญชีถูกระงับ', success: false });
            return res.status(403).json({ success: false, msg: `บัญชีถูกระงับ: ${user.banReason || 'ติดต่อแอดมิน'}` });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            await logAction({ req, user, action: 'login_failed', details: 'รหัสผ่านไม่ถูกต้อง', success: false });
            return res.status(401).json({ success: false, msg: 'รหัสผ่านไม่ถูกต้อง' });
        }

        const accessToken = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id, user.tokenVersion);
        setRefreshCookie(res, refreshToken);

        await logAction({ req, user, action: 'login', details: `ผู้ใช้ "${user.username}" เข้าสู่ระบบสำเร็จ` });

        res.json({ success: true, token: accessToken, user });
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== REFRESH TOKEN (#2) ====================
router.post('/refresh-token', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ success: false, msg: 'ไม่พบ Refresh Token' });
        }

        const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
        const decoded = jwt.verify(refreshToken, secret);
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ success: false, msg: 'Token ไม่ถูกต้อง' });
        }

        const user = await User.findById(decoded.id);
        if (!user || user.isBanned) {
            clearRefreshCookie(res);
            return res.status(401).json({ success: false, msg: 'บัญชีไม่พร้อมใช้งาน' });
        }

        // ตรวจ tokenVersion — ถ้าเปลี่ยนรหัสผ่านแล้ว refresh token เก่าใช้ไม่ได้
        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            clearRefreshCookie(res);
            return res.status(401).json({ success: false, msg: 'Token ถูกยกเลิก กรุณาเข้าสู่ระบบใหม่' });
        }

        // Generate new tokens
        const newAccessToken = generateToken(user._id);
        const newRefreshToken = generateRefreshToken(user._id, user.tokenVersion);
        setRefreshCookie(res, newRefreshToken);

        res.json({ success: true, token: newAccessToken });
    } catch (err) {
        clearRefreshCookie(res);
        res.status(401).json({ success: false, msg: 'Refresh Token หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
    }
});

// ==================== LOGOUT ====================
router.post('/logout', (req, res) => {
    clearRefreshCookie(res);
    res.json({ success: true, msg: 'ออกจากระบบสำเร็จ' });
});

// ==================== GET CURRENT USER ====================
router.get('/me', auth, async (req, res) => {
    res.json({ success: true, user: req.user });
});

// ==================== UPDATE PROFILE ====================
router.put('/profile', auth, profileLimiter, async (req, res) => {
    try {
        const { robloxUsername } = req.body;

        // Validate robloxUsername
        if (robloxUsername !== undefined) {
            const trimmed = String(robloxUsername).trim();
            if (trimmed.length > 50) {
                return res.status(400).json({ success: false, msg: 'Roblox Username ยาวเกินไป (สูงสุด 50 ตัวอักษร)' });
            }
            if (trimmed.length > 0 && !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                return res.status(400).json({ success: false, msg: 'Roblox Username ใช้ได้เฉพาะตัวอักษร ตัวเลข และ _' });
            }
        }

        const sanitized = String(robloxUsername || '').trim();
        const user = await User.findByIdAndUpdate(req.user._id, { robloxUsername: sanitized }, { new: true });

        await logAction({ req, user, action: 'profile_update', details: `อัปเดต Roblox Username เป็น "${sanitized}"` });

        res.json({ success: true, msg: 'อัปเดตโปรไฟล์สำเร็จ', user });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== CHANGE PASSWORD ====================
router.put('/change-password', auth, changePasswordRules, validate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ success: false, msg: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

        user.password = newPassword;
        user.tokenVersion += 1; // Invalidate all refresh tokens
        await user.save();

        await logAction({ req, user, action: 'password_change', details: 'เปลี่ยนรหัสผ่านสำเร็จ' });

        res.json({ success: true, msg: 'เปลี่ยนรหัสผ่านสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== FORGOT PASSWORD — STEP 1: ส่ง OTP ====================
router.post('/forgot-password', forgotPasswordRules, validate, async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            await logAction({ req, user: { username: email }, action: 'password_reset_request', details: 'ไม่พบอีเมลในระบบ', success: false });
            return res.status(404).json({ success: false, msg: 'ไม่พบอีเมลนี้ในระบบ' });
        }

        // Rate limit: max 3 OTP requests per 10 minutes per email
        const recentOTPs = await OTP.countDocuments({
            email: email.toLowerCase().trim(),
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
        });
        if (recentOTPs >= 3) {
            return res.status(429).json({ success: false, msg: 'ส่ง OTP มากเกินไป กรุณารอ 10 นาที' });
        }

        // Generate 6-digit OTP
        const otpCode = crypto.randomInt(100000, 999999).toString();

        // Invalidate previous OTPs
        await OTP.updateMany(
            { userId: user._id, purpose: 'password_reset', isUsed: false },
            { isUsed: true }
        );

        // Save new OTP (expires in 10 minutes)
        await OTP.create({
            userId: user._id,
            email: email.toLowerCase().trim(),
            code: otpCode,
            purpose: 'password_reset',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });

        const emailResult = await sendOTPEmail(email, otpCode, user.username);

        await logAction({
            req, user,
            action: 'password_reset_request',
            details: `ส่ง OTP ไปยัง ${email}`,
            metadata: { emailSent: emailResult.success, previewUrl: emailResult.previewUrl },
        });

        const response = {
            success: true,
            msg: `ส่งรหัส OTP ไปยัง ${email} แล้ว กรุณาตรวจสอบอีเมล`,
        };

        if (emailResult.previewUrl) {
            response.previewUrl = emailResult.previewUrl;
            response.msg += ` (Dev: ดูอีเมลที่ ${emailResult.previewUrl})`;
        }

        res.json(response);
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== FORGOT PASSWORD — STEP 2: ตรวจสอบ OTP ====================
router.post('/verify-otp', verifyOtpRules, validate, async (req, res) => {
    try {
        const { email, code } = req.body;

        const otp = await OTP.findOne({
            email: email.toLowerCase().trim(),
            purpose: 'password_reset',
            isUsed: false,
            expiresAt: { $gt: new Date() },
        }).sort('-createdAt');

        if (!otp) {
            return res.status(400).json({ success: false, msg: 'รหัส OTP หมดอายุหรือไม่ถูกต้อง กรุณาขอรหัสใหม่' });
        }

        if (otp.attempts >= otp.maxAttempts) {
            otp.isUsed = true;
            await otp.save();
            return res.status(400).json({ success: false, msg: 'ลองผิดมากเกินไป กรุณาขอรหัส OTP ใหม่' });
        }

        if (otp.code !== code.trim()) {
            otp.attempts += 1;
            await otp.save();
            const remaining = otp.maxAttempts - otp.attempts;
            return res.status(400).json({ success: false, msg: `รหัส OTP ไม่ถูกต้อง (เหลือ ${remaining} ครั้ง)` });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        otp.isUsed = true;
        otp.metadata = { resetToken };
        await otp.save();

        const user = await User.findById(otp.userId);
        if (!user) return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });

        await OTP.create({
            userId: user._id,
            email: email.toLowerCase().trim(),
            code: resetToken,
            purpose: 'reset_verified',
            isUsed: false,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });

        await logAction({ req, user, action: 'password_reset_otp_verify', details: `OTP ถูกต้อง สำหรับ ${email}` });

        res.json({ success: true, msg: 'รหัส OTP ถูกต้อง กรุณาตั้งรหัสผ่านใหม่', resetToken });
    } catch (err) {
        console.error('Verify OTP error:', err);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== FORGOT PASSWORD — STEP 3: ตั้งรหัสผ่านใหม่ ====================
router.post('/reset-password', resetPasswordRules, validate, async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        const otpRecord = await OTP.findOne({
            email: email.toLowerCase().trim(),
            code: resetToken,
            purpose: 'reset_verified',
            isUsed: false,
            expiresAt: { $gt: new Date() },
        });

        if (!otpRecord) {
            return res.status(400).json({ success: false, msg: 'ลิงก์รีเซ็ตหมดอายุ กรุณาขอรหัส OTP ใหม่' });
        }

        const user = await User.findById(otpRecord.userId);
        if (!user) return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });

        user.password = newPassword;
        user.tokenVersion += 1; // Invalidate all refresh tokens
        await user.save();

        otpRecord.isUsed = true;
        await otpRecord.save();

        await OTP.updateMany(
            { email: email.toLowerCase().trim(), isUsed: false },
            { isUsed: true }
        );

        await logAction({ req, user, action: 'password_reset_complete', details: `รีเซ็ตรหัสผ่านสำเร็จสำหรับ ${email}` });

        res.json({ success: true, msg: 'ตั้งรหัสผ่านใหม่สำเร็จ! กรุณาเข้าสู่ระบบ' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GOOGLE OAuth ====================
if (oauthConfigured.google) {
    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

    router.get('/google/callback', passport.authenticate('google', {
        session: false,
        failureRedirect: '/pages/login.html?error=google_failed',
    }), async (req, res) => {
        try {
            const accessToken = generateToken(req.user._id);
            const refreshToken = generateRefreshToken(req.user._id, req.user.tokenVersion);
            setRefreshCookie(res, refreshToken);
            await logAction({ req, user: req.user, action: 'social_login_google', details: `Google login: ${req.user.username}` });
            res.redirect(`/pages/login.html#token=${accessToken}&social=google`);
        } catch (err) {
            res.redirect('/pages/login.html?error=google_failed');
        }
    });
} else {
    router.get('/google', oauthUnavailable('google'));
    router.get('/google/callback', oauthUnavailable('google'));
}

// ==================== FACEBOOK OAuth ====================
if (oauthConfigured.facebook) {
    router.get('/facebook', passport.authenticate('facebook', { scope: ['email'], session: false }));

    router.get('/facebook/callback', passport.authenticate('facebook', {
        session: false,
        failureRedirect: '/pages/login.html?error=facebook_failed',
    }), async (req, res) => {
        try {
            const accessToken = generateToken(req.user._id);
            const refreshToken = generateRefreshToken(req.user._id, req.user.tokenVersion);
            setRefreshCookie(res, refreshToken);
            await logAction({ req, user: req.user, action: 'social_login_facebook', details: `Facebook login: ${req.user.username}` });
            res.redirect(`/pages/login.html#token=${accessToken}&social=facebook`);
        } catch (err) {
            res.redirect('/pages/login.html?error=facebook_failed');
        }
    });
} else {
    router.get('/facebook', oauthUnavailable('facebook'));
    router.get('/facebook/callback', oauthUnavailable('facebook'));
}

module.exports = router;
