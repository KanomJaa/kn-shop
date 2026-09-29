// ================================================================
// LINE Messaging API — operational notifications
// ================================================================

const crypto = require('crypto');

const LINE_API_BASE = 'https://api.line.me/v2/bot/message';
const MAX_TEXT_LENGTH = 5000;

function getTargetIds() {
    return (process.env.LINE_USER_IDS || process.env.LINE_USER_ID || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
}

function getDeliveryRequest(message) {
    const targets = getTargetIds();
    const messages = [{ type: 'text', text: String(message).slice(0, MAX_TEXT_LENGTH) }];

    if (targets.length === 1) {
        return { mode: 'push', url: `${LINE_API_BASE}/push`, body: { to: targets[0], messages } };
    }
    if (targets.length > 1) {
        return {
            mode: 'multicast',
            url: `${LINE_API_BASE}/multicast`,
            body: { to: targets.slice(0, 500), messages },
        };
    }
    if (process.env.LINE_BROADCAST_ENABLED === 'true') {
        return { mode: 'broadcast', url: `${LINE_API_BASE}/broadcast`, body: { messages } };
    }
    return null;
}

async function readLineError(response) {
    const raw = await response.text();
    if (!raw) return `LINE API returned HTTP ${response.status}`;
    try {
        const parsed = JSON.parse(raw);
        const details = Array.isArray(parsed.details)
            ? parsed.details.map((item) => item.message).filter(Boolean).join(', ')
            : '';
        return [parsed.message, details].filter(Boolean).join(': ') || raw;
    } catch (err) {
        return raw.slice(0, 500);
    }
}

/**
 * Uses push/multicast when LINE_USER_ID(S) is configured; otherwise broadcasts
 * to every friend of the LINE Official Account.
 */
async function sendLineNotify(message) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
    if (!token) {
        const error = 'LINE_CHANNEL_ACCESS_TOKEN is not configured';
        console.warn(`⚠️ ${error}`);
        return { success: false, error, mode: 'disabled' };
    }

    const request = getDeliveryRequest(message);
    if (!request) {
        const error = 'LINE_USER_ID or LINE_USER_IDS is not configured';
        console.warn(`⚠️ ${error}; broadcast is disabled for customer privacy`);
        return { success: false, error, mode: 'disabled' };
    }
    try {
        const response = await fetch(request.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                'X-Line-Retry-Key': crypto.randomUUID(),
            },
            body: JSON.stringify(request.body),
            signal: AbortSignal.timeout(10000),
        });

        const requestId = response.headers.get('x-line-request-id') || undefined;
        if (!response.ok) {
            const error = await readLineError(response);
            const hint = request.mode === 'push' && response.status === 400
                ? 'Check that LINE_USER_ID belongs to this Messaging API provider and the user is a friend of the Official Account.'
                : undefined;
            console.error(`❌ LINE ${request.mode} failed (${response.status})`, { error, hint, requestId });
            return { success: false, error, hint, status: response.status, requestId, mode: request.mode };
        }

        console.log(`✅ LINE notification sent via ${request.mode}`, requestId ? `(request ${requestId})` : '');
        return { success: true, requestId, mode: request.mode };
    } catch (err) {
        const error = err.name === 'TimeoutError' ? 'LINE API request timed out' : err.message;
        console.error(`❌ LINE ${request.mode} request failed:`, error);
        return { success: false, error, mode: request.mode };
    }
}

function formatBangkokTime(value = new Date()) {
    return value.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}

function notifyNewOrder(order, username) {
    const totalPoints = Number(order.totalPoints ?? order.totalPrice ?? 0);
    const msg = `🛒 ออเดอร์ใหม่!\n\n👤 ลูกค้า: ${username}\n🔖 เลขออเดอร์: ${order.orderId || '-'}\n📦 สินค้า: ${order.items?.length || 0} รายการ\n💰 ยอดรวม: ${totalPoints.toLocaleString()} P\n🕐 เวลา: ${formatBangkokTime()}`;
    return sendLineNotify(msg);
}

function notifyTopup(username, amount) {
    const msg = `💳 เติมเงินใหม่!\n\n👤 ผู้ใช้: ${username}\n💰 จำนวน: ${Number(amount).toLocaleString()} P\n🕐 เวลา: ${formatBangkokTime()}`;
    return sendLineNotify(msg);
}

function notifyNewUser(username, email) {
    const msg = `👋 สมาชิกใหม่!\n\n👤 ชื่อ: ${username}\n📧 อีเมล: ${email}\n🕐 เวลา: ${formatBangkokTime()}`;
    return sendLineNotify(msg);
}

function getLineStatus() {
    const targets = getTargetIds();
    const broadcastEnabled = process.env.LINE_BROADCAST_ENABLED === 'true';
    return {
        configured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim()),
        mode: targets.length === 0
            ? (broadcastEnabled ? 'broadcast' : 'disabled')
            : targets.length === 1 ? 'push' : 'multicast',
        targetCount: targets.length,
        broadcastEnabled,
        webhookSignatureConfigured: Boolean(process.env.LINE_CHANNEL_SECRET?.trim()),
    };
}

module.exports = {
    sendLineNotify,
    notifyNewOrder,
    notifyTopup,
    notifyNewUser,
    getLineStatus,
};
