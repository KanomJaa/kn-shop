const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const User = require('../models/User');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

// Helper: Escape regex special characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ==================== PUBLIC STATS (for homepage) ====================
router.get('/public-stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments({ isActive: true });
        const inStockProducts = await Product.countDocuments({ isActive: true, inStock: true });

        // Total sold count
        const soldResult = await Product.aggregate([
            { $group: { _id: null, totalSold: { $sum: '$soldCount' } } }
        ]);
        const totalSold = soldResult[0]?.totalSold || 0;

        // Total orders
        const totalOrders = await Order.countDocuments();

        res.json({
            success: true,
            stats: { totalUsers, totalProducts, inStockProducts, totalSold, totalOrders }
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET ALL PRODUCTS ====================
router.get('/', async (req, res) => {
    try {
        const { category, active, search } = req.query;
        const filter = {};
        if (category) filter.categorySlug = category;
        if (active !== undefined) filter.isActive = active === 'true';
        else filter.isActive = true;
        if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };

        const products = await Product.find(filter).populate('category', 'name slug icon').sort('sortOrder');
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET BY CATEGORY SLUG ====================
router.get('/category/:slug', async (req, res) => {
    try {
        const products = await Product.find({ categorySlug: req.params.slug, isActive: true })
            .populate('category', 'name slug icon headerColor')
            .sort('sortOrder');
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET SINGLE PRODUCT ====================
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug');
        if (!product) return res.status(404).json({ success: false, msg: 'ไม่พบสินค้า' });

        // Get reviews
        const reviews = await Review.find({ product: req.params.id }).sort('-createdAt');
        const avgRating = reviews.length > 0
            ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
            : 0;

        res.json({ success: true, product, reviews, avgRating, reviewCount: reviews.length });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== ADD REVIEW ====================
router.post('/:id/review', auth, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) return res.status(400).json({ success: false, msg: 'คะแนนต้อง 1-5' });

        // Check if already reviewed
        const existing = await Review.findOne({ product: req.params.id, user: req.user._id });
        if (existing) return res.status(400).json({ success: false, msg: 'คุณรีวิวสินค้านี้ไปแล้ว' });

        const review = await Review.create({
            product: req.params.id,
            user: req.user._id,
            username: req.user.username,
            rating,
            comment: comment || ''
        });

        res.status(201).json({ success: true, msg: 'ขอบคุณสำหรับรีวิว!', review });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;
