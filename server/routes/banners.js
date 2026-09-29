const express = require('express');
const Banner = require('../models/Banner');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort('sortOrder');
        res.json({ success: true, banners });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;
