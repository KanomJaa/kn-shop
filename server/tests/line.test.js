const {
    sendLineNotify,
    notifyNewOrder,
    getLineStatus,
} = require('../utils/line');

const originalEnv = {
    token: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    userId: process.env.LINE_USER_ID,
    userIds: process.env.LINE_USER_IDS,
    secret: process.env.LINE_CHANNEL_SECRET,
    broadcastEnabled: process.env.LINE_BROADCAST_ENABLED,
};
const originalFetch = global.fetch;

function restoreEnv(name, value) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
}

function mockResponse({ ok = true, status = 200, body = '', requestId = 'request-123' } = {}) {
    return {
        ok,
        status,
        headers: { get: (name) => name.toLowerCase() === 'x-line-request-id' ? requestId : null },
        text: jest.fn().mockResolvedValue(body),
    };
}

afterEach(() => {
    restoreEnv('LINE_CHANNEL_ACCESS_TOKEN', originalEnv.token);
    restoreEnv('LINE_USER_ID', originalEnv.userId);
    restoreEnv('LINE_USER_IDS', originalEnv.userIds);
    restoreEnv('LINE_CHANNEL_SECRET', originalEnv.secret);
    restoreEnv('LINE_BROADCAST_ENABLED', originalEnv.broadcastEnabled);
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});

describe('LINE Messaging API notifications', () => {
    it('fails clearly when the access token is missing', async () => {
        delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
        global.fetch = jest.fn();
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await sendLineNotify('test');

        expect(result.success).toBe(false);
        expect(result.error).toContain('LINE_CHANNEL_ACCESS_TOKEN');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('pushes directly to LINE_USER_ID and uses totalPoints in order messages', async () => {
        process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
        process.env.LINE_USER_ID = 'U123456789';
        delete process.env.LINE_USER_IDS;
        global.fetch = jest.fn().mockResolvedValue(mockResponse());
        jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await notifyNewOrder({
            orderId: 'ORD-123',
            totalPoints: 250,
            items: [{ title: 'Item' }],
        }, 'buyer');

        expect(result).toMatchObject({ success: true, mode: 'push' });
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.line.me/v2/bot/message/push',
            expect.any(Object)
        );
        const request = global.fetch.mock.calls[0][1];
        const payload = JSON.parse(request.body);
        expect(payload.to).toBe('U123456789');
        expect(payload.messages[0].text).toContain('250 P');
        expect(payload.messages[0].text).toContain('ORD-123');
        expect(request.headers.Authorization).toBe('Bearer test-token');
        expect(request.headers['X-Line-Retry-Key']).toBeTruthy();
    });

    it('broadcasts only when explicitly enabled', async () => {
        process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
        delete process.env.LINE_USER_ID;
        delete process.env.LINE_USER_IDS;
        process.env.LINE_BROADCAST_ENABLED = 'true';
        global.fetch = jest.fn().mockResolvedValue(mockResponse());
        jest.spyOn(console, 'log').mockImplementation(() => {});

        const result = await sendLineNotify('broadcast test');

        expect(result.mode).toBe('broadcast');
        expect(global.fetch.mock.calls[0][0]).toBe('https://api.line.me/v2/bot/message/broadcast');
        expect(JSON.parse(global.fetch.mock.calls[0][1].body)).not.toHaveProperty('to');
    });

    it('does not broadcast private shop notifications by default', async () => {
        process.env.LINE_CHANNEL_ACCESS_TOKEN = 'test-token';
        delete process.env.LINE_USER_ID;
        delete process.env.LINE_USER_IDS;
        delete process.env.LINE_BROADCAST_ENABLED;
        global.fetch = jest.fn();
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await sendLineNotify('private order data');

        expect(result).toMatchObject({ success: false, mode: 'disabled' });
        expect(result.error).toContain('LINE_USER_ID');
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns the LINE API error and request ID for diagnosis', async () => {
        process.env.LINE_CHANNEL_ACCESS_TOKEN = 'bad-token';
        process.env.LINE_USER_ID = 'U123';
        global.fetch = jest.fn().mockResolvedValue(mockResponse({
            ok: false,
            status: 401,
            body: JSON.stringify({ message: 'Authentication failed' }),
            requestId: 'failed-request',
        }));
        jest.spyOn(console, 'error').mockImplementation(() => {});

        const result = await sendLineNotify('test');

        expect(result).toMatchObject({
            success: false,
            status: 401,
            error: 'Authentication failed',
            requestId: 'failed-request',
            mode: 'push',
        });
    });

    it('reports configuration without exposing credentials or target IDs', () => {
        process.env.LINE_CHANNEL_ACCESS_TOKEN = 'secret-token';
        process.env.LINE_USER_IDS = 'U1,U2';
        process.env.LINE_CHANNEL_SECRET = 'secret';
        delete process.env.LINE_BROADCAST_ENABLED;

        expect(getLineStatus()).toEqual({
            configured: true,
            mode: 'multicast',
            targetCount: 2,
            broadcastEnabled: false,
            webhookSignatureConfigured: true,
        });
    });
});
