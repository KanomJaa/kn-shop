const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const { generateToken } = require('../middleware/auth');

let app;
let mongoServer;

beforeAll(async () => {
    process.env.JWT_SECRET = 'orders-test-secret';
    process.env.NODE_ENV = 'test';
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = express();
    app.use(express.json());
    app.use('/api/orders', require('../routes/orders'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    jest.restoreAllMocks();
    await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

async function createFixture({ points = 100, stockQty = 1 } = {}) {
    const user = await User.create({
        username: 'buyer',
        email: 'buyer@example.com',
        password: 'pass123',
        points,
    });
    const category = await Category.create({ name: 'Test', slug: 'test' });
    const product = await Product.create({
        title: 'Limited item',
        price: 25,
        category: category._id,
        categorySlug: category.slug,
        stockQty,
    });
    return { user, product, token: generateToken(user._id) };
}

describe('POST /api/orders/checkout', () => {
    it('deducts points and finite stock once', async () => {
        const { user, product, token } = await createFixture();

        const res = await request(app)
            .post('/api/orders/checkout')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ productId: product._id.toString(), qty: 1 }] });

        expect(res.status).toBe(201);
        expect(await Order.countDocuments()).toBe(1);
        expect((await User.findById(user._id)).points).toBe(75);

        const updatedProduct = await Product.findById(product._id);
        expect(updatedProduct.stockQty).toBe(0);
        expect(updatedProduct.inStock).toBe(false);
        expect(updatedProduct.soldCount).toBe(1);
    });

    it('does not charge points for an invalid product', async () => {
        const { user, token } = await createFixture();

        const res = await request(app)
            .post('/api/orders/checkout')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ productId: new mongoose.Types.ObjectId().toString(), qty: 1 }] });

        expect(res.status).toBe(400);
        expect((await User.findById(user._id)).points).toBe(100);
        expect(await Order.countDocuments()).toBe(0);
    });

    it('compensates points, stock, and order when standalone checkout fails late', async () => {
        const { user, product, token } = await createFixture();
        jest.spyOn(Transaction, 'create').mockRejectedValueOnce(new Error('transaction record unavailable'));

        const res = await request(app)
            .post('/api/orders/checkout')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ productId: product._id.toString(), qty: 1 }] });

        expect(res.status).toBe(500);
        expect((await User.findById(user._id)).points).toBe(100);
        expect(await Order.countDocuments()).toBe(0);

        const restoredProduct = await Product.findById(product._id);
        expect(restoredProduct.stockQty).toBe(1);
        expect(restoredProduct.inStock).toBe(true);
        expect(restoredProduct.soldCount).toBe(0);
    });
});
