const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { validate, topupRules } = require('../middleware/validate');
const { topupLimiter } = require('../middleware/userRateLimit');
const { notifyTopup } = require('../utils/line');

// ==================== GET WALLET INFO ====================
router.get('/balance', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });
        res.json({ success: true, points: user.points });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET TRANSACTION HISTORY ====================
router.get('/history', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user._id }).sort('-createdAt').limit(50);
        res.json({ success: true, transactions });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== TOPUP POINT (PENDING → ADMIN APPROVE) ====================
router.post('/topup', auth, topupLimiter, topupRules, validate, async (req, res) => {
    try {
        const { amount, method, slipImage } = req.body;

        // ตรวจสอบว่ามีรายการ pending อยู่ไม่เกิน 3 รายการ
        const pendingCount = await Transaction.countDocuments({
            user: req.user._id,
            type: 'topup',
            status: 'pending'
        });
        if (pendingCount >= 3) {
            return res.status(400).json({
                success: false,
                msg: 'คุณมีรายการรอตรวจสอบ 3 รายการแล้ว กรุณารอ Admin อนุมัติก่อน'
            });
        }

        // ❌ ไม่เพิ่ม Point ทันที — รอ Admin อนุมัติ
        const transaction = await Transaction.create({
            user: req.user._id,
            type: 'topup',
            amount: amount,
            method,
            slipImage: slipImage,
            status: 'pending',
            note: `เติม ${amount} Point ผ่านโอนธนาคาร (รอตรวจสอบ)`
        });

        await logAction({
            req, user: req.user,
            action: 'topup_request',
            details: `ส่งคำขอเติม ${amount} Point ผ่าน ${method} พร้อมสลิป (รอ Admin อนุมัติ)`,
            metadata: { amount, method, transactionId: transaction._id, slipImage },
        });

        // แจ้งเตือน Line (non-blocking)
        notifyTopup(req.user.username, amount).catch(() => {});

        res.json({
            success: true,
            msg: `ส่งคำขอเติม ${amount.toLocaleString()} Point สำเร็จ! กรุณารอ Admin ตรวจสอบและอนุมัติ`,
            transaction,
            status: 'pending'
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET PENDING TOPUPS (for user) ====================
router.get('/pending-topups', auth, async (req, res) => {
    try {
        const pending = await Transaction.find({
            user: req.user._id,
            type: 'topup',
            status: 'pending'
        }).sort('-createdAt');
        res.json({ success: true, pending });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GENERATE PROMPTPAY QR (ปิดปรับปรุง) ====================
router.post('/promptpay-qr', auth, async (req, res) => {
    return res.status(503).json({ success: false, msg: 'PromptPay QR ปิดปรับปรุงชั่วคราว' });
});

module.exports = router;
