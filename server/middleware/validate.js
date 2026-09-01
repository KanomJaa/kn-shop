// ================================================================
//  Input Validation Middleware
//  ใช้ express-validator สำหรับ validate request data
// ================================================================
const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware ตรวจ validation errors
 * ใส่หลัง validation chain เสมอ
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            msg: errors.array()[0].msg,
            errors: errors.array().map(e => ({ field: e.path, msg: e.msg })),
        });
    }
    next();
};

// ==================== AUTH VALIDATIONS ====================
const registerRules = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('ชื่อผู้ใช้ต้องมี 3-30 ตัวอักษร')
        .matches(/^[a-zA-Z0-9_ก-๙]+$/).withMessage('ชื่อผู้ใช้ใช้ได้เฉพาะ ตัวอักษร ตัวเลข และ _'),
    body('email')
        .trim()
        .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'),
];

const loginRules = [
    body('emailOrUsername')
        .trim()
        .notEmpty().withMessage('กรุณากรอกอีเมลหรือชื่อผู้ใช้'),
    body('password')
        .notEmpty().withMessage('กรุณากรอกรหัสผ่าน'),
];

const changePasswordRules = [
    body('currentPassword').notEmpty().withMessage('กรุณากรอกรหัสผ่านปัจจุบัน'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'),
];

const forgotPasswordRules = [
    body('email')
        .trim()
        .isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง')
        .normalizeEmail(),
];

const verifyOtpRules = [
    body('email').trim().isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
    body('code')
        .trim()
        .isLength({ min: 6, max: 6 }).withMessage('รหัส OTP ต้องเป็นตัวเลข 6 หลัก')
        .isNumeric().withMessage('รหัส OTP ต้องเป็นตัวเลข'),
];

const resetPasswordRules = [
    body('email').trim().isEmail().withMessage('รูปแบบอีเมลไม่ถูกต้อง'),
    body('resetToken').notEmpty().withMessage('ไม่พบ Reset Token'),
    body('newPassword')
        .isLength({ min: 6 }).withMessage('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'),
];

// ==================== ORDER VALIDATIONS ====================
const checkoutRules = [
    body('items')
        .isArray({ min: 1 }).withMessage('ตะกร้าว่างเปล่า'),
    body('items.*.productId')
        .notEmpty().withMessage('ข้อมูลสินค้าไม่ครบ')
        .isMongoId().withMessage('รหัสสินค้าไม่ถูกต้อง'),
    body('items.*.qty')
        .isInt({ min: 1, max: 100 }).withMessage('จำนวนสินค้าต้องอยู่ระหว่าง 1-100'),
];

// ==================== PAYMENT VALIDATIONS ====================
const topupRules = [
    body('amount')
        .isInt({ min: 1, max: 100000 }).withMessage('จำนวนเงินต้องอยู่ระหว่าง 1-100,000'),
    body('method')
        .notEmpty().withMessage('เลือกวิธีชำระเงิน')
        .isIn(['bank']).withMessage('ช่องทางนี้ไม่รองรับ'),
    body('slipImage')
        .notEmpty().withMessage('กรุณาแนบสลิปการโอนเงิน'),
];

// ==================== ADMIN VALIDATIONS ====================
const adminPointsRules = [
    param('id').isMongoId().withMessage('รหัสผู้ใช้ไม่ถูกต้อง'),
    body('amount')
        .isInt().withMessage('จำนวนต้องเป็นตัวเลข')
        .custom(val => val !== 0).withMessage('จำนวนต้องไม่เท่ากับ 0'),
];

const adminProductRules = [
    body('title').trim().notEmpty().withMessage('กรุณากรอกชื่อสินค้า'),
    body('price')
        .isInt({ min: 0 }).withMessage('ราคาต้องเป็นจำนวนเต็ม 0 ขึ้นไป'),
    body('categoryId')
        .notEmpty().withMessage('เลือกหมวดหมู่')
        .isMongoId().withMessage('รหัสหมวดหมู่ไม่ถูกต้อง'),
    body('categorySlug')
        .notEmpty().withMessage('กรุณาระบุ slug หมวดหมู่'),
];

const adminCategoryRules = [
    body('name').trim().notEmpty().withMessage('กรุณากรอกชื่อหมวดหมู่'),
    body('slug').trim().notEmpty().withMessage('กรุณากรอก slug'),
];

const mongoIdParam = [
    param('id').isMongoId().withMessage('รหัสไม่ถูกต้อง'),
];

module.exports = {
    validate,
    registerRules,
    loginRules,
    changePasswordRules,
    forgotPasswordRules,
    verifyOtpRules,
    resetPasswordRules,
    checkoutRules,
    topupRules,
    adminPointsRules,
    adminProductRules,
    adminCategoryRules,
    mongoIdParam,
};
