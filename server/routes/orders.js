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
        const session = await mongoose.startSession();

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
                const product = await Product.findById(item.product).session(session);
                if (!product) {
                    const stockError = new Error(`ไม่พบสินค้า "${item.title}"`);
                    stockError.code = 'STOCK_CHANGED';
                    throw stockError;
                }
                if (product.stockQty !== -1) {
                    const updatedProduct = await Product.findOneAndUpdate(
                        {
                            _id: item.product,
                            isActive: true,
                            inStock: true,
                            stockQty: { $gte: item.qty },
                        },
                        {
                            $inc: { stockQty: -item.qty, soldCount: item.qty },
                            ...(product.stockQty === item.qty ? { $set: { inStock: false } } : {}),
                        },
                        { new: true, session }
                    );
                    if (!updatedProduct) {
                        const stockError = new Error(`สินค้า "${item.title}" มีสต็อกไม่เพียงพอ`);
                        stockError.code = 'STOCK_CHANGED';
                        throw stockError;
                    }
                } else {
                    await Product.findByIdAndUpdate(
                        item.product,
                        { $inc: { soldCount: item.qty } },
                        { session }
                    );
                }
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

                const reservedStock = [];
                let fallbackOrder = null;
                try {
                    for (const item of orderItems) {
                        const product = await Product.findById(item.product);
                        if (!product) throw new Error(`ไม่พบสินค้า "${item.title}"`);

                        if (product.stockQty === -1) {
                            await Product.findByIdAndUpdate(item.product, { $inc: { soldCount: item.qty } });
                            reservedStock.push({ productId: item.product, qty: item.qty, unlimited: true });
                            continue;
                        }

                        const updatedProduct = await Product.findOneAndUpdate(
                            {
                                _id: item.product,
                                isActive: true,
                                inStock: true,
                                stockQty: { $gte: item.qty },
                            },
                            {
                                $inc: { stockQty: -item.qty, soldCount: item.qty },
                                ...(product.stockQty === item.qty ? { $set: { inStock: false } } : {}),
                            },
                            { new: true }
                        );
                        if (!updatedProduct) {
                            const stockError = new Error(`สินค้า "${item.title}" มีสต็อกไม่เพียงพอ`);
                            stockError.code = 'STOCK_CHANGED';
                            throw stockError;
                        }
                        reservedStock.push({ productId: item.product, qty: item.qty, unlimited: false });
                    }

                    const todayFb = new Date();
                    todayFb.setHours(0, 0, 0, 0);
                    const todayOrdersFb = await Order.countDocuments({ createdAt: { $gte: todayFb } });

                    fallbackOrder = await Order.create({
                        user: user._id, username: user.username,
                        items: orderItems, totalPoints, queueNumber: todayOrdersFb + 1,
                    });

                    await Transaction.create({
                        user: user._id, type: 'purchase',
                        amount: -totalPoints, orderId: fallbackOrder.orderId,
                        note: `สั่งซื้อ ${orderItems.length} รายการ`
                    });
                    order = fallbackOrder;
                } catch (fallbackErr) {
                    // Best-effort compensation for standalone MongoDB, where true transactions
                    // are unavailable. This covers stock, points, and a partially created order.
                    const rollbackTasks = [
                        User.findByIdAndUpdate(user._id, { $inc: { points: totalPoints } }),
                        ...reservedStock.map((reserved) => Product.findByIdAndUpdate(
                            reserved.productId,
                            reserved.unlimited
                                ? { $inc: { soldCount: -reserved.qty } }
                                : { $inc: { stockQty: reserved.qty, soldCount: -reserved.qty }, $set: { inStock: true } }
                        )),
                    ];
                    if (fallbackOrder) rollbackTasks.push(Order.deleteOne({ _id: fallbackOrder._id }));
                    const rollbackResults = await Promise.allSettled(rollbackTasks);
                    if (rollbackResults.some((result) => result.status === 'rejected')) {
                        console.error('Checkout compensation was only partially successful');
                    }
                    throw fallbackErr;
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
        if (err.code === 'STOCK_CHANGED') {
            return res.status(409).json({ success: false, msg: err.message });
        }
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
