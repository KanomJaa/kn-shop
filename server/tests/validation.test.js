// ================================================================
//  Validation Middleware Tests
// ================================================================
const request = require('supertest');
const express = require('express');
const { validate, registerRules, topupRules, checkoutRules } = require('../middleware/validate');

let app;

beforeAll(() => {
    app = express();
    app.use(express.json());

    // Test routes
    app.post('/test/register', registerRules, validate, (req, res) => {
        res.json({ success: true });
    });

    app.post('/test/topup', topupRules, validate, (req, res) => {
        res.json({ success: true });
    });

    app.post('/test/checkout', checkoutRules, validate, (req, res) => {
        res.json({ success: true });
    });
});

// ==================== REGISTER VALIDATION ====================
describe('Register Validation', () => {
    it('should pass with valid data', async () => {
        const res = await request(app)
            .post('/test/register')
            .send({ username: 'testuser', email: 'test@email.com', password: 'pass123' });
        expect(res.status).toBe(200);
    });

    it('should reject short username', async () => {
        const res = await request(app)
            .post('/test/register')
            .send({ username: 'ab', email: 'test@email.com', password: 'pass123' });
        expect(res.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
        const res = await request(app)
            .post('/test/register')
            .send({ username: 'testuser', email: 'invalidemail', password: 'pass123' });
        expect(res.status).toBe(400);
        expect(res.body.errors[0].field).toBe('email');
    });

    it('should reject password shorter than 6 chars', async () => {
        const res = await request(app)
            .post('/test/register')
            .send({ username: 'testuser', email: 'test@email.com', password: '12345' });
        expect(res.status).toBe(400);
    });

    it('should reject username with special chars', async () => {
        const res = await request(app)
            .post('/test/register')
            .send({ username: 'test<>user', email: 'test@email.com', password: 'pass123' });
        expect(res.status).toBe(400);
    });
});

// ==================== TOPUP VALIDATION ====================
describe('Topup Validation', () => {
    it('should pass with valid amount', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: 100, method: 'bank', slipImage: '/uploads/slip.jpg' });
        expect(res.status).toBe(200);
    });

    it('should reject amount = 0', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: 0, method: 'bank', slipImage: '/uploads/slip.jpg' });
        expect(res.status).toBe(400);
    });

    it('should reject negative amount', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: -100, method: 'bank', slipImage: '/uploads/slip.jpg' });
        expect(res.status).toBe(400);
    });

    it('should reject amount over 100000', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: 200000, method: 'bank', slipImage: '/uploads/slip.jpg' });
        expect(res.status).toBe(400);
    });

    it('should reject invalid method', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: 100, method: 'bitcoin', slipImage: '/uploads/slip.jpg' });
        expect(res.status).toBe(400);
    });

    it('should reject missing slipImage', async () => {
        const res = await request(app)
            .post('/test/topup')
            .send({ amount: 100, method: 'bank' });
        expect(res.status).toBe(400);
    });
});

// ==================== CHECKOUT VALIDATION ====================
describe('Checkout Validation', () => {
    it('should pass with valid items', async () => {
        const res = await request(app)
            .post('/test/checkout')
            .send({ items: [{ productId: '64abc123def4560000000001', qty: 1 }] });
        expect(res.status).toBe(200);
    });

    it('should reject empty items array', async () => {
        const res = await request(app)
            .post('/test/checkout')
            .send({ items: [] });
        expect(res.status).toBe(400);
    });

    it('should reject non-MongoId productId', async () => {
        const res = await request(app)
            .post('/test/checkout')
            .send({ items: [{ productId: 'not-a-mongo-id', qty: 1 }] });
        expect(res.status).toBe(400);
    });

    it('should reject qty = 0', async () => {
        const res = await request(app)
            .post('/test/checkout')
            .send({ items: [{ productId: '64abc123def4560000000001', qty: 0 }] });
        expect(res.status).toBe(400);
    });

    it('should reject qty > 100', async () => {
        const res = await request(app)
            .post('/test/checkout')
            .send({ items: [{ productId: '64abc123def4560000000001', qty: 101 }] });
        expect(res.status).toBe(400);
    });
});
