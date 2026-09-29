const request = require('supertest');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-key';

const app = require('../app');

describe('Application routing and exposure', () => {
    it('returns the public health check', async () => {
        const res = await request(app).get('/api/health');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.status).toBe('healthy');
    });

    it('returns JSON 404 for unknown API routes', async () => {
        const res = await request(app).get('/api/does-not-exist');

        expect(res.status).toBe(404);
        expect(res.type).toMatch(/json/);
        expect(res.body.success).toBe(false);
    });

    it('does not expose backend source files as static assets', async () => {
        const res = await request(app).get('/server/server.js');

        expect(res.status).toBe(404);
        expect(res.text).not.toContain("require('./bootstrap/startServer')");
    });

    it('protects operational security details', async () => {
        const res = await request(app).get('/api/security-info');

        expect(res.status).toBe(401);
    });

    it('rejects an unconfigured LINE webhook without requiring CSRF', async () => {
        const originalSecret = process.env.LINE_CHANNEL_SECRET;
        delete process.env.LINE_CHANNEL_SECRET;
        const res = await request(app)
            .post('/webhook/line')
            .send({ events: [] });
        if (originalSecret === undefined) delete process.env.LINE_CHANNEL_SECRET;
        else process.env.LINE_CHANNEL_SECRET = originalSecret;

        expect(res.status).toBe(503);
    });

    it('accepts a LINE webhook only with a valid provider signature', async () => {
        const originalSecret = process.env.LINE_CHANNEL_SECRET;
        const secret = 'line-test-secret';
        const payload = JSON.stringify({ events: [] });
        const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64');
        process.env.LINE_CHANNEL_SECRET = secret;

        const res = await request(app)
            .post('/webhook/line')
            .set('Content-Type', 'application/json')
            .set('x-line-signature', signature)
            .send(payload);

        if (originalSecret === undefined) delete process.env.LINE_CHANNEL_SECRET;
        else process.env.LINE_CHANNEL_SECRET = originalSecret;
        expect(res.status).toBe(200);
    });
});
