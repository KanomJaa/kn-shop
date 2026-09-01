const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');
const { logAction } = require('../utils/logger');
const { validate, checkoutRules } = require('../middleware/validate');
const { notifyNewOrder } = require('../utils/line');
const { checkoutLimiter } = require('../middleware/userRateLimit');

// ==================== CHECKOUT (CREATE ORDER) with MongoDB Transaction (#3) ====================
router.post('/checkout', auth, checkoutLimiter, checkoutRules, validate, async (req, res) => {
    // Start MongoDB session for transaction safety
    const session = await mongoose.startSession();

    try {
        const { items } = req.body;

        // Calculate total and validate products
        let totalPoints = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) return res.status(400).json({ success: false, msg: `ไม่พบสินค้า: ${item.productId}` });
            if (!product.isActive || !product.inStock) {
                return res.status(400).json({ success: false, msg: `สินค้า "${product.title}" หมดสต็อกหรือไม่พร้อมขาย` });
            }
            if (product.stockQty !== -1 && product.stockQty < item.qty) {
                return res.status(400).json({ success: false, msg: `สินค้า "${product.title}" สต็อกไม่เพียงพอ (เหลือ ${product.stockQty})` });
            }

            totalPoints += product.price * item.qty;
            orderItems.push({
                product: product._id,
                title: product.title,
                price: product.price,
                qty: item.qty,
                robloxUsername: item.robloxUsername || ''
            });
        }

        // Check user points
        const user = await User.findById(req.user._id);
        if (user.points < totalPoints) {
            return res.status(400).json({
                success: false,
                msg: `Point ไม่เพียงพอ (ต้องการ ${totalPoints.toLocaleString()}, มี ${user.points.toLocaleString()})`
            });
        }

        // ==================== BEGIN TRANSACTION ====================
        let updatedUser, order;

        try {
            session.startTransaction();

            // Deduct points atomically
            updatedUser = await User.findOneAndUpdate(
                { _id: user._id, points: { $gte: totalPoints } },
                { $inc: { points: -totalPoints } },
                { new: true, session }
            );
            if (!updatedUser) throw new Error('ไม่สามารถหัก Point ได้');

            // Calculate queue number (within session for consistency)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } }).session(session);

            // Create order
            [order] = await Order.create([{
                user: user._id,
                username: user.username,
                items: orderItems,
                totalPoints,
                queueNumber: todayOrders + 1,
            }], { session });

            // Create transaction record
            await Transaction.create([{
                user: user._id,
                type: 'purchase',
                amount: -totalPoints,
                orderId: order.orderId,
                note: `สั่งซื้อ ${orderItems.length} รายการ`
            }], { session });

            // Deduct stock atomically
            for (const item of orderItems) {
                const updateOps = { $inc: { soldCount: item.qty } };
                const product = await Product.findById(item.product).session(session);
                if (product && product.stockQty !== -1) {
                    updateOps.$inc.stockQty = -item.qty;
                    if (product.stockQty - item.qty <= 0) {
                        updateOps.$set = { inStock: false };
                    }
                }
                await Product.findByIdAndUpdate(item.product, updateOps, { session });
            }

            await session.commitTransaction();
        } catch (txErr) {
            await session.abortTransaction();
            console.error('Transaction aborted:', txErr.message);

            // Fallback: ถ้า MongoDB ไม่รองรับ transaction (ไม่ได้ใช้ Replica Set)
            // ทำแบบเดิม (non-transactional)
            if (txErr.message?.includes('Transaction') || txErr.codeName === 'IllegalOperation') {
                console.warn('⚠️ MongoDB Transactions not supported, using fallback');

                updatedUser = await User.findOneAndUpdate(
                    { _id: user._id, points: { $gte: totalPoints } },
                    { $inc: { points: -totalPoints } },
                    { new: true }
                );
                if (!updatedUser) return res.status(400).json({ success: false, msg: 'ไม่สามารถหัก Point ได้' });

                const todayFb = new Date();
                todayFb.setHours(0, 0, 0, 0);
                const todayOrdersFb = await Order.countDocuments({ createdAt: { $gte: todayFb } });

                order = await Order.create({
                    user: user._id, username: user.username,
                    items: orderItems, totalPoints, queueNumber: todayOrdersFb + 1,
                });

                await Transaction.create({
                    user: user._id, type: 'purchase',
                    amount: -totalPoints, orderId: order.orderId,
                    note: `สั่งซื้อ ${orderItems.length} รายการ`
                });

                for (const item of orderItems) {
                    const updateOps = { $inc: { soldCount: item.qty } };
                    const prod = await Product.findById(item.product);
                    if (prod && prod.stockQty !== -1) {
                        updateOps.$inc.stockQty = -item.qty;
                        if (prod.stockQty - item.qty <= 0) updateOps.$set = { inStock: false };
                    }
                    await Product.findByIdAndUpdate(item.product, updateOps);
                }
            } else {
                throw txErr;
            }
        } finally {
            session.endSession();
        }
        // ==================== END TRANSACTION ====================

        await logAction({
            req, user: updatedUser,
            action: 'purchase',
            details: `สั่งซื้อ ${orderItems.length} รายการ (${totalPoints} Points) หมายเลข: ${order.orderId}`,
            metadata: { orderId: order.orderId, totalPoints, itemCount: orderItems.length },
        });

        // แจ้งเตือน Line (non-blocking)
        notifyNewOrder(order, updatedUser.username).catch(() => {});

        res.status(201).json({
            success: true,
            msg: `สั่งซื้อสำเร็จ! หมายเลข: ${order.orderId}`,
            order,
            user: updatedUser
        });
    } catch (err) {
        console.error('Checkout error:', err.message);
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET USER ORDERS ====================
router.get('/my-orders', auth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
        res.json({ success: true, orders });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

// ==================== GET ORDER BY ID ====================
router.get('/:id', auth, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id, user: req.user._id });
        if (!order) return res.status(404).json({ success: false, msg: 'ไม่พบออเดอร์' });
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, msg: 'เกิดข้อผิดพลาด' });
    }
});

module.exports = router;
