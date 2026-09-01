const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== MAGIC BYTES SIGNATURES (#4) ====================
const MAGIC_BYTES = {
    'ffd8ff': 'image/jpeg',     // JPEG
    '89504e47': 'image/png',    // PNG
    '47494638': 'image/gif',    // GIF
    '52494646': 'image/webp',   // WebP (RIFF header)
};

/**
 * ตรวจสอบ Magic Bytes ของไฟล์จริง (ไม่ใช่แค่ extension)
 * ป้องกันการเปลี่ยน extension ไฟล์อันตรายเป็น .jpg
 */
function validateMagicBytes(filePath) {
    try {
        const buffer = Buffer.alloc(8);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 8, 0);
        fs.closeSync(fd);

        const hex = buffer.toString('hex').toLowerCase();

        for (const [magic, mimeType] of Object.entries(MAGIC_BYTES)) {
            if (hex.startsWith(magic)) return { valid: true, mimeType };
        }

        return { valid: false, mimeType: null };
    } catch (err) {
        return { valid: false, mimeType: null };
    }
}

// ==================== MULTER CONFIG ====================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('อนุญาตเฉพาะไฟล์รูปภาพ (.jpg, .png, .gif, .webp)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
});

// ==================== SLIP STORAGE (แยกโฟลเดอร์สลิป) ====================
const slipStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const slipDir = path.join(__dirname, '../uploads/slips');
        if (!fs.existsSync(slipDir)) fs.mkdirSync(slipDir, { recursive: true });
        cb(null, slipDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
    }
});

const uploadSlip = multer({
    storage: slipStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

/**
 * Post-upload middleware: ตรวจ Magic Bytes หลัง upload
 * ถ้าไฟล์ไม่ใช่รูปภาพจริง → ลบทิ้งทันที
 */
function verifyUpload(req, res, next) {
    if (!req.file) return next();

    const result = validateMagicBytes(req.file.path);
    if (!result.valid) {
        // ลบไฟล์อันตรายทิ้ง
        fs.unlink(req.file.path, () => { });
        return res.status(400).json({
            success: false,
            msg: 'ไฟล์ไม่ใช่รูปภาพที่ถูกต้อง ตรวจพบเนื้อหาไม่ตรงกับนามสกุล'
        });
    }

    req.file.detectedMimeType = result.mimeType;
    next();
}

// ==================== UPLOAD IMAGE (Admin only) ====================
router.post('/', adminAuth, upload.single('image'), verifyUpload, (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, msg: 'กรุณาเลือกไฟล์รูปภาพ' });
        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, msg: 'อัปโหลดสำเร็จ', imageUrl });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== UPLOAD SLIP (User) ====================
router.post('/slip', auth, uploadSlip.single('slip'), verifyUpload, (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, msg: 'กรุณาเลือกไฟล์สลิป' });
        const slipUrl = `/uploads/slips/${req.file.filename}`;
        res.json({ success: true, msg: 'อัปโหลดสลิปสำเร็จ', slipUrl });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});
// ==================== MULTER ERROR HANDLER ====================
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, msg: 'ไฟล์มีขนาดใหญ่เกินไป (สูงสุด 5MB)' });
        }
        return res.status(400).json({ success: false, msg: `Upload error: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ success: false, msg: err.message || 'เกิดข้อผิดพลาดในการอัปโหลด' });
    }
    next();
});

module.exports = router;
