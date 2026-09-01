const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

// ==================== GET ALL CATEGORIES (with stats) ====================
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.active !== 'false') filter.isActive = true;
        const categories = await Category.find(filter).sort('sortOrder').lean();

        // Attach product count + soldCount + stockQty per category
        const stats = await Product.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: '$categorySlug',
                    productCount: { $sum: 1 },
                    totalSold: { $sum: '$soldCount' },
                    // stockQty: -1 = unlimited → ไม่นับรวมใน totalStock
                    totalStock: { $sum: { $cond: [{ $gt: ['$stockQty', 0] }, '$stockQty', 0] } },
                    hasUnlimited: { $max: { $cond: [{ $eq: ['$stockQty', -1] }, true, false] } }
                }
            }
        ]);
        const statsMap = {};
        stats.forEach(s => { statsMap[s._id] = s; });

        categories.forEach(c => {
            const s = statsMap[c.slug] || {};
            c.productCount = s.productCount || 0;
            c.totalSold = s.totalSold || 0;
            c.totalStock = s.totalStock || 0;
            c.hasUnlimited = s.hasUnlimited || false;
        });

        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET SINGLE CATEGORY ====================
router.get('/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) return res.status(404).json({ success: false, msg: 'ไม่พบหมวดหมู่' });
        res.json({ success: true, category });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;

