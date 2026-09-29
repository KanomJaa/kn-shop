const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Review = require('../models/Review');
const Banner = require('../models/Banner');
const ActionLog = require('../models/ActionLog');
const { adminAuth } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { sendLineNotify, getLineStatus } = require('../utils/line');
const {
    validate,
    adminPointsRules,
    adminProductRules,
    adminCategoryRules,
    mongoIdParam,
} = require('../middleware/validate');

// Helper: Escape regex special characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// All routes require admin auth
router.use(adminAuth);

// LINE diagnostics. Never expose access tokens or target IDs.
router.get('/line/status', (req, res) => {
    res.json({ success: true, line: getLineStatus() });
});

router.post('/line/test', async (req, res) => {
    const result = await sendLineNotify(
        `✅ ทดสอบการแจ้งเตือน KN Shop\n\n👤 ทดสอบโดย: ${req.user.username}\n🕐 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
    );
    if (!result.success) {
        return res.status(502).json({ success: false, msg: result.error, line: result });
    }
    return res.json({ success: true, msg: 'ส่งข้อความทดสอบ LINE สำเร็จ', line: result });
});

// ================================================================
// ==================== ACTION LOGS ====================
// ================================================================
router.get('/action-logs', async (req, res) => {
    try {
        const { action, userId, page = 1, limit = 50 } = req.query;
        const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
        const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50));
        const filter = {};
        if (action) filter.action = action;
        if (userId) filter.userId = userId;

        const total = await ActionLog.countDocuments(filter);
        const logs = await ActionLog.find(filter)
            .sort('-createdAt')
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit)
            .lean();

        res.json({
            success: true,
            logs,
            total,
            page: safePage,
            totalPages: Math.ceil(total / safeLimit),
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== DASHBOARD STATS ====================
// ================================================================
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: { $in: ['pending', 'processing'] } });
        const totalProducts = await Product.countDocuments();

        // Revenue
        const revenueResult = await Order.aggregate([
            { $match: { status: { $in: ['completed', 'processing', 'pending'] } } },
            { $group: { _id: null, total: { $sum: '$totalPoints' } } }
        ]);
        const totalRevenue = revenueResult[0]?.total || 0;

        // Today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenueResult = await Order.aggregate([
            { $match: { createdAt: { $gte: today }, status: { $in: ['completed', 'processing', 'pending'] } } },
            { $group: { _id: null, total: { $sum: '$totalPoints' }, count: { $sum: 1 } } }
        ]);
        const todayRevenue = todayRevenueResult[0]?.total || 0;
        const todayOrders = todayRevenueResult[0]?.count || 0;

        res.json({
            success: true,
            stats: { totalUsers, totalOrders, pendingOrders, totalProducts, totalRevenue, todayRevenue, todayOrders }
        });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== USER MANAGEMENT ====================
// ================================================================
router.get('/users', async (req, res) => {
    try {
        const { search, role, banned } = req.query;
        const filter = {};
        if (search) filter.$or = [
            { username: { $regex: escapeRegex(search), $options: 'i' } },
            { email: { $regex: escapeRegex(search), $options: 'i' } }
        ];
        if (role) filter.role = role;
        if (banned !== undefined) filter.isBanned = banned === 'true';

        const users = await User.find(filter).sort('-createdAt');
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Add/Deduct points
router.put('/users/:id/points', adminPointsRules, validate, async (req, res) => {
    try {
        const { amount, note } = req.body; // positive = add, negative = deduct
        if (!amount || amount === 0) return res.status(400).json({ success: false, msg: 'จำนวนไม่ถูกต้อง' });

        // Atomic operation: ถ้าลดคะแนน ต้องเช็คว่า points >= |amount|
        const filter = { _id: req.params.id };
        if (amount < 0) {
            filter.points = { $gte: Math.abs(amount) };
        }

        const user = await User.findOneAndUpdate(
            filter,
            { $inc: { points: amount } },
            { new: true }
        );

        if (!user) {
            // อาจไม่พบ user หรือ points ไม่พอ
            const exists = await User.findById(req.params.id);
            if (!exists) return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });
            return res.status(400).json({ success: false, msg: 'Point ผู้ใช้ไม่เพียงพอ' });
        }

        await Transaction.create({
            user: user._id,
            type: amount > 0 ? 'admin_add' : 'admin_deduct',
            amount,
            method: 'admin',
            note: note || `Admin ${amount > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(amount)} Point`
        });

        await logAction({
            req, user: req.user,
            action: amount > 0 ? 'admin_add_points' : 'admin_deduct_points',
            details: `${amount > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(amount)} Point ให้ ${user.username}`,
            metadata: { targetUserId: user._id, amount, note },
        });

        res.json({ success: true, msg: `${amount > 0 ? 'เพิ่ม' : 'ลด'} ${Math.abs(amount)} Point สำเร็จ`, user });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Ban/Unban user
router.put('/users/:id/ban', mongoIdParam, validate, async (req, res) => {
    try {
        const { ban, reason } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, {
            isBanned: ban,
            banReason: ban ? (reason || 'ละเมิดกฎ') : ''
        }, { new: true });
        if (!user) return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });

        await logAction({
            req, user: req.user,
            action: ban ? 'admin_ban_user' : 'admin_unban_user',
            details: `${ban ? 'แบน' : 'ปลดแบน'} ผู้ใช้ ${user.username}${ban && reason ? ': ' + reason : ''}`,
            metadata: { targetUserId: user._id, ban, reason },
        });

        res.json({ success: true, msg: ban ? 'แบนผู้ใช้แล้ว' : 'ปลดแบนแล้ว', user });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== ORDER MANAGEMENT ====================
// ================================================================
router.get('/orders', async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (search) filter.$or = [
            { orderId: { $regex: escapeRegex(search), $options: 'i' } },
            { username: { $regex: escapeRegex(search), $options: 'i' } }
        ];
        const orders = await Order.find(filter).sort('-createdAt');
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Update order status
router.put('/orders/:id/status', async (req, res) => {
    try {
        const { status, note } = req.body;
        const valid = ['pending', 'processing', 'completed', 'failed', 'refunded'];
        if (!valid.includes(status)) return res.status(400).json({ success: false, msg: 'สถานะไม่ถูกต้อง' });

        const order = await Order.findOne({ orderId: req.params.id });
        if (!order) return res.status(404).json({ success: false, msg: 'ไม่พบออเดอร์' });

        order.status = status;
        order.statusNote = note || '';
        if (status === 'completed') order.completedAt = new Date();
        await order.save();

        await logAction({
            req, user: req.user,
            action: 'admin_update_order',
            details: `อัปเดตสถานะออเดอร์ ${req.params.id} เป็น "${status}"`,
            metadata: { orderId: req.params.id, status, note },
        });

        res.json({ success: true, msg: `อัปเดตสถานะเป็น "${status}" แล้ว`, order });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Refund order
router.post('/orders/:id/refund', async (req, res) => {
    try {
        // Claim the refund atomically so concurrent admin requests cannot credit twice.
        const order = await Order.findOneAndUpdate(
            { orderId: req.params.id, refunded: false },
            { $set: { refunded: true, status: 'refunded' } },
            { new: false }
        );
        if (!order) {
            const existing = await Order.findOne({ orderId: req.params.id });
            if (!existing) return res.status(404).json({ success: false, msg: 'ไม่พบออเดอร์' });
            return res.status(400).json({ success: false, msg: 'ออเดอร์นี้คืนเงินไปแล้ว' });
        }

        let pointsRefunded = false;
        try {
            const refundedUser = await User.findByIdAndUpdate(
                order.user,
                { $inc: { points: order.totalPoints } },
                { new: true }
            );
            if (!refundedUser) throw new Error('ไม่พบผู้ใช้สำหรับคืนเงิน');
            pointsRefunded = true;

            await Transaction.create({
                user: order.user,
                type: 'refund',
                amount: order.totalPoints,
                orderId: order.orderId,
                note: `คืน Point จากออเดอร์ ${order.orderId}`
            });
        } catch (refundErr) {
            if (pointsRefunded) {
                await User.findByIdAndUpdate(order.user, { $inc: { points: -order.totalPoints } });
            }
            await Order.updateOne(
                { _id: order._id, refunded: true },
                { $set: { refunded: false, status: order.status } }
            );
            throw refundErr;
        }

        order.refunded = true;
        order.status = 'refunded';

        await logAction({
            req, user: req.user,
            action: 'admin_refund_order',
            details: `คืน ${order.totalPoints} Point จากออเดอร์ ${order.orderId}`,
            metadata: { orderId: order.orderId, amount: order.totalPoints, userId: order.user },
        });

        res.json({ success: true, msg: `คืน ${order.totalPoints.toLocaleString()} Point แล้ว`, order });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== CATEGORY MANAGEMENT ====================
// ================================================================
// Create category
router.post('/categories', adminCategoryRules, validate, async (req, res) => {
    try {
        const { name, slug, description, icon, headerColor, image, isHot } = req.body;
        if (!name || !slug) return res.status(400).json({ success: false, msg: 'กรอกชื่อและ slug' });

        const existing = await Category.findOne({ $or: [{ name }, { slug }] });
        if (existing) return res.status(400).json({ success: false, msg: 'ชื่อหรือ slug ซ้ำ' });

        const count = await Category.countDocuments();
        const category = await Category.create({ name, slug, description, icon, headerColor, image, isHot: isHot || false, sortOrder: count });

        await logAction({
            req, user: req.user,
            action: 'admin_create_category',
            details: `สร้างหมวดหมู่ "${name}" (${slug})`,
            metadata: { categoryId: category._id, name, slug },
        });

        res.status(201).json({ success: true, msg: 'สร้างหมวดหมู่สำเร็จ', category });
    } catch (err) {
        console.error('Category create error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Update category
router.put('/categories/:id', mongoIdParam, validate, async (req, res) => {
    try {
        // Whitelist allowed fields to prevent mass assignment
        const allowed = ['name', 'slug', 'description', 'icon', 'headerColor', 'image', 'isActive', 'isHot', 'sortOrder'];
        const updateData = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        });

        const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!category) return res.status(404).json({ success: false, msg: 'ไม่พบหมวดหมู่' });

        await logAction({
            req, user: req.user,
            action: 'admin_update_category',
            details: `อัปเดตหมวดหมู่ "${category.name}"`,
            metadata: { categoryId: category._id, updateData },
        });

        res.json({ success: true, msg: 'อัปเดตหมวดหมู่สำเร็จ', category });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Delete category
router.delete('/categories/:id', mongoIdParam, validate, async (req, res) => {
    try {
        const productCount = await Product.countDocuments({ category: req.params.id });
        if (productCount > 0) {
            return res.status(400).json({ success: false, msg: `ไม่สามารถลบได้ มีสินค้า ${productCount} รายการ ในหมวดหมู่นี้` });
        }
        const delCat = await Category.findByIdAndDelete(req.params.id);
        if (!delCat) return res.status(404).json({ success: false, msg: 'ไม่พบหมวดหมู่' });

        await logAction({
            req, user: req.user,
            action: 'admin_delete_category',
            details: `ลบหมวดหมู่ "${delCat?.name || req.params.id}"`,
            metadata: { categoryId: req.params.id },
        });

        res.json({ success: true, msg: 'ลบหมวดหมู่สำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== PRODUCT MANAGEMENT (CRUD) ====================
// ================================================================
// Get all products (including inactive)
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().populate('category', 'name slug').sort('categorySlug sortOrder');
        res.json({ success: true, products });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Create product
router.post('/products', adminProductRules, validate, async (req, res) => {
    try {
        const { title, price, categoryId, categorySlug, description, image, imgLabel, inStock, stockQty, deliveryMethod } = req.body;
        if (!title || price == null || !categoryId || !categorySlug) {
            return res.status(400).json({ success: false, msg: 'กรอกข้อมูลที่จำเป็น (title, price, categoryId, categorySlug)' });
        }
        const count = await Product.countDocuments({ categorySlug });
        const product = await Product.create({
            title, price, category: categoryId, categorySlug,
            description: description || '', image: image || '', imgLabel: imgLabel || title,
            inStock: inStock !== false,
            stockQty: stockQty === undefined || stockQty === null || stockQty === '' ? -1 : Number(stockQty),
            deliveryMethod: deliveryMethod || 'gift', sortOrder: count
        });

        await logAction({
            req, user: req.user,
            action: 'admin_create_product',
            details: `สร้างสินค้า "${title}" (ราคา: ${price})`,
            metadata: { productId: product._id, title, price, categorySlug },
        });

        res.status(201).json({ success: true, msg: 'สร้างสินค้าสำเร็จ', product });
    } catch (err) {
        console.error('Product create error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Update product
router.put('/products/:id', mongoIdParam, validate, async (req, res) => {
    try {
        const { title, price, categoryId, categorySlug, description, image, imgLabel, inStock, stockQty, isActive, deliveryMethod } = req.body;
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (price !== undefined) updateData.price = price;
        if (categoryId !== undefined) updateData.category = categoryId; // map categoryId → category
        if (categorySlug !== undefined) updateData.categorySlug = categorySlug;
        if (description !== undefined) updateData.description = description;
        if (image !== undefined) updateData.image = image;
        if (imgLabel !== undefined) updateData.imgLabel = imgLabel;
        if (inStock !== undefined) updateData.inStock = inStock;
        if (stockQty !== undefined) updateData.stockQty = stockQty;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (deliveryMethod !== undefined) updateData.deliveryMethod = deliveryMethod;

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('category', 'name slug');
        if (!product) return res.status(404).json({ success: false, msg: 'ไม่พบสินค้า' });

        await logAction({
            req, user: req.user,
            action: 'admin_update_product',
            details: `อัปเดตสินค้า "${product.title}"`,
            metadata: { productId: product._id, updateData },
        });

        res.json({ success: true, msg: 'อัปเดตสินค้าสำเร็จ', product });
    } catch (err) {
        console.error('Product update error:', err);
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Toggle product active / in-stock
router.put('/products/:id/toggle', mongoIdParam, validate, async (req, res) => {
    try {
        const { field } = req.body; // 'isActive', 'inStock', or 'isHot'
        if (!['isActive', 'inStock', 'isHot'].includes(field)) return res.status(400).json({ success: false, msg: 'field ไม่ถูกต้อง' });

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, msg: 'ไม่พบสินค้า' });

        product[field] = !product[field];
        await product.save();

        res.json({ success: true, msg: `${field} เปลี่ยนเป็น ${product[field]}`, product });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Delete product
router.delete('/products/:id', mongoIdParam, validate, async (req, res) => {
    try {
        const delProduct = await Product.findByIdAndDelete(req.params.id);
        if (!delProduct) return res.status(404).json({ success: false, msg: 'ไม่พบสินค้า' });
        await Review.deleteMany({ product: req.params.id });

        await logAction({
            req, user: req.user,
            action: 'admin_delete_product',
            details: `ลบสินค้า "${delProduct?.title || req.params.id}"`,
            metadata: { productId: req.params.id },
        });

        res.json({ success: true, msg: 'ลบสินค้าสำเร็จ' });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== SALES REPORT ====================
// ================================================================
router.get('/sales-report', async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const since = new Date();
        since.setDate(since.getDate() - parseInt(days));

        // Daily breakdown
        const dailySales = await Order.aggregate([
            { $match: { createdAt: { $gte: since }, status: { $in: ['completed', 'processing', 'pending'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                    total: { $sum: '$totalPoints' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // Monthly breakdown
        const monthlySales = await Order.aggregate([
            { $match: { status: { $in: ['completed', 'processing', 'pending'] } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                    count: { $sum: 1 },
                    total: { $sum: '$totalPoints' }
                }
            },
            { $sort: { _id: -1 } }
        ]);

        // Topup stats
        const topupStats = await Transaction.aggregate([
            { $match: { type: 'topup', status: 'success' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]);

        res.json({ success: true, dailySales, monthlySales, topupStats: topupStats[0] || { total: 0, count: 0 } });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== TOPUP MANAGEMENT ====================
// ================================================================

// Get all topup transactions (with user info)
router.get('/topups', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = { type: 'topup' };
        if (status) filter.status = status;

        const topups = await Transaction.find(filter)
            .populate('user', 'username email')
            .sort('-createdAt')
            .limit(200);
        res.json({ success: true, topups });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Get pending topup count (for dashboard badge)
router.get('/topups/pending-count', async (req, res) => {
    try {
        const count = await Transaction.countDocuments({ type: 'topup', status: 'pending' });
        res.json({ success: true, count });
    } catch (err) {
        res.json({ success: true, count: 0 });
    }
});

// Approve topup → add points to user
router.put('/topups/:id/approve', mongoIdParam, validate, async (req, res) => {
    try {
        // Claim only a pending topup. This prevents double approval under concurrency.
        const transaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, type: 'topup', status: 'pending' },
            {
                $set: {
                    status: 'success',
                    approvedBy: req.user._id,
                    approvedAt: new Date(),
                },
            },
            { new: true }
        ).populate('user', 'username email');
        if (!transaction) {
            const existing = await Transaction.findById(req.params.id);
            if (!existing) return res.status(404).json({ success: false, msg: 'ไม่พบรายการ' });
            if (existing.type !== 'topup') return res.status(400).json({ success: false, msg: 'รายการนี้ไม่ใช่การเติมเงิน' });
            return res.status(400).json({ success: false, msg: 'รายการนี้ดำเนินการแล้ว' });
        }

        // Atomic add points
        const user = await User.findByIdAndUpdate(
            transaction.user._id,
            { $inc: { points: transaction.amount } },
            { new: true }
        );
        if (!user) {
            await Transaction.updateOne(
                { _id: transaction._id, status: 'success' },
                { $set: { status: 'pending' }, $unset: { approvedBy: 1, approvedAt: 1 } }
            );
            return res.status(404).json({ success: false, msg: 'ไม่พบผู้ใช้' });
        }

        // The approval is already complete. Updating the explanatory note is best-effort
        // and must not turn a successful credit into a misleading retryable failure.
        await Transaction.updateOne(
            { _id: transaction._id },
            { $set: { note: `เติม ${transaction.amount} Point ผ่านโอนธนาคาร (Admin อนุมัติ)` } }
        ).catch((noteErr) => console.warn('Could not update topup note:', noteErr.message));

        // Log action
        await logAction({
            req,
            user: req.user,
            action: 'topup_approve',
            details: `อนุมัติเติม ${transaction.amount} Point ให้ ${transaction.user.username}`,
            metadata: { transactionId: transaction._id, amount: transaction.amount, targetUser: transaction.user.username },
        });

        res.json({
            success: true,
            msg: `อนุมัติ ${transaction.amount.toLocaleString()} Point ให้ ${transaction.user.username} สำเร็จ! (ยอดคงเหลือ: ${user.points.toLocaleString()})`,
            transaction
        });
    } catch (err) {
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Reject topup
router.put('/topups/:id/reject', mongoIdParam, validate, async (req, res) => {
    try {
        const { reason } = req.body;
        const transaction = await Transaction.findById(req.params.id).populate('user', 'username email');
        if (!transaction) return res.status(404).json({ success: false, msg: 'ไม่พบรายการ' });
        if (transaction.type !== 'topup') return res.status(400).json({ success: false, msg: 'รายการนี้ไม่ใช่การเติมเงิน' });
        if (transaction.status !== 'pending') return res.status(400).json({ success: false, msg: 'รายการนี้ดำเนินการแล้ว' });

        transaction.status = 'failed';
        transaction.note = `ปฏิเสธ: ${reason || 'ไม่พบหลักฐานการโอน'}`;
        transaction.rejectedBy = req.user._id;
        transaction.rejectedAt = new Date();
        await transaction.save();

        // Log action
        await logAction({
            req,
            user: req.user,
            action: 'topup_reject',
            details: `ปฏิเสธเติม ${transaction.amount} Point ของ ${transaction.user.username} (${reason || 'ไม่พบหลักฐาน'})`,
            metadata: { transactionId: transaction._id, amount: transaction.amount, targetUser: transaction.user.username, reason },
        });

        res.json({
            success: true,
            msg: `ปฏิเสธรายการเติม ${transaction.amount.toLocaleString()} Point ของ ${transaction.user.username}`,
            transaction
        });
    } catch (err) {
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ================================================================
// ==================== BANNER MANAGEMENT ====================
// ================================================================

// Get all banners
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find().sort('sortOrder');
        res.json({ success: true, banners });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Create banner
router.post('/banners', async (req, res) => {
    try {
        const { title, image, link, isHot } = req.body;
        if (!image) return res.status(400).json({ success: false, msg: 'กรุณาอัปโหลดรูปภาพ' });
        const count = await Banner.countDocuments();
        const banner = await Banner.create({ title, image, link, isHot: isHot || false, sortOrder: count });
        res.status(201).json({ success: true, msg: 'เพิ่ม Banner สำเร็จ', banner });
    } catch (err) {
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Update banner
router.put('/banners/:id', mongoIdParam, validate, async (req, res) => {
    try {
        // Whitelist allowed fields to prevent mass assignment
        const allowed = ['title', 'image', 'link', 'isActive', 'isHot', 'sortOrder'];
        const updateData = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updateData[field] = req.body[field];
        });

        const banner = await Banner.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!banner) return res.status(404).json({ success: false, msg: 'ไม่พบ Banner' });
        res.json({ success: true, msg: 'อัปเดต Banner สำเร็จ', banner });
    } catch (err) {
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// Delete banner
router.delete('/banners/:id', mongoIdParam, validate, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) return res.status(404).json({ success: false, msg: 'ไม่พบ Banner' });
        res.json({ success: true, msg: 'ลบ Banner สำเร็จ' });
    } catch (err) {
        console.error('Admin error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;
