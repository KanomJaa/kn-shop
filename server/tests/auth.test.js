// ================================================================
//  Auth API Tests
// ================================================================
const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Setup
let app, mongoServer;
const User = require('../models/User');

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'test-secret-key-12345';
    process.env.ACCESS_TOKEN_EXPIRES = '15m';
    process.env.REFRESH_TOKEN_EXPIRES = '7d';
    process.env.NODE_ENV = 'test';

    await mongoose.connect(mongoServer.getUri());

    // Create minimal Express app for testing
    app = express();
    app.use(express.json());
    app.use(require('cookie-parser')());
    app.use('/api/auth', require('../routes/auth'));
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await User.deleteMany({});
});

// ==================== REGISTER TESTS ====================
describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'testuser', email: 'test@email.com', password: 'pass123' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.username).toBe('testuser');
    });

    it('should reject short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test', email: 'test@email.com', password: '123' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should reject invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test', email: 'not-an-email', password: 'pass123' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    it('should reject missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test' });

        expect(res.status).toBe(400);
    });

    it('should reject duplicate username', async () => {
        await User.create({ username: 'taken', email: 'one@email.com', password: 'pass123' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'taken', email: 'two@email.com', password: 'pass123' });

        expect(res.status).toBe(400);
        expect(res.body.msg).toContain('ชื่อผู้ใช้');
    });

    it('should reject duplicate email', async () => {
        await User.create({ username: 'user1', email: 'same@email.com', password: 'pass123' });

        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'user2', email: 'same@email.com', password: 'pass123' });

        expect(res.status).toBe(400);
        expect(res.body.msg).toContain('อีเมล');
    });

    it('should reject username with special characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'test<script>', email: 'test@email.com', password: 'pass123' });

        expect(res.status).toBe(400);
    });
});

// ==================== LOGIN TESTS ====================
describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await User.create({ username: 'loginuser', email: 'login@email.com', password: 'pass123' });
    });

    it('should login with correct credentials (username)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'loginuser', password: 'pass123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.token).toBeDefined();
    });

    it('should login with correct credentials (email)', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'login@email.com', password: 'pass123' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('should reject wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'loginuser', password: 'wrongpass' });

        expect(res.status).toBe(401);
        expect(res.body.msg).toContain('รหัสผ่าน');
    });

    it('should reject non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'nouser', password: 'pass123' });

        expect(res.status).toBe(401);
    });

    it('should reject banned user', async () => {
        await User.updateOne({ username: 'loginuser' }, { isBanned: true, banReason: 'spam' });

        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'loginuser', password: 'pass123' });

        expect(res.status).toBe(403);
        expect(res.body.msg).toContain('ระงับ');
    });

    it('should set refreshToken cookie on login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'loginuser', password: 'pass123' });

        expect(res.status).toBe(200);
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
    });
});

// ==================== AUTH MIDDLEWARE TESTS ====================
describe('GET /api/auth/me', () => {
    it('should reject request without token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid-token');
        expect(res.status).toBe(401);
    });

    it('should return user with valid token', async () => {
        // Register to get token
        const regRes = await request(app)
            .post('/api/auth/register')
            .send({ username: 'metest', email: 'me@email.com', password: 'pass123' });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${regRes.body.token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.username).toBe('metest');
    });
});

// ==================== REFRESH TOKEN TESTS ====================
describe('POST /api/auth/refresh-token', () => {
    it('should reject without refresh cookie', async () => {
        const res = await request(app).post('/api/auth/refresh-token');
        expect(res.status).toBe(401);
    });

    it('should issue new access token with valid refresh token', async () => {
        // Login to get refresh cookie
        await User.create({ username: 'refreshuser', email: 'refresh@email.com', password: 'pass123' });
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ emailOrUsername: 'refreshuser', password: 'pass123' });

        const cookies = loginRes.headers['set-cookie'];
        const refreshCookie = cookies.find(c => c.includes('refreshToken'));

        const res = await request(app)
            .post('/api/auth/refresh-token')
            .set('Cookie', refreshCookie);

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });
});

// ==================== LOGOUT TESTS ====================
describe('POST /api/auth/logout', () => {
    it('should clear refresh cookie', async () => {
        const res = await request(app).post('/api/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.msg).toContain('ออกจากระบบ');
    });
});

describe('OAuth configuration fallback', () => {
    it('should redirect Google login to a useful error when OAuth is not configured', async () => {
        const res = await request(app).get('/api/auth/google');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/pages/login.html?error=google_unavailable');
    });

    it('should redirect Facebook login to a useful error when OAuth is not configured', async () => {
        const res = await request(app).get('/api/auth/facebook');

        expect(res.status).toBe(302);
        expect(res.headers.location).toBe('/pages/login.html?error=facebook_unavailable');
    });
});
