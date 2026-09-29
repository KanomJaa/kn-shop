const crypto = require('crypto');
const express = require('express');

const router = express.Router();

function hasValidLineSignature(req) {
    const secret = process.env.LINE_CHANNEL_SECRET;
    const signature = req.get('x-line-signature');

    if (!secret || !signature || !Buffer.isBuffer(req.rawBody)) return false;

    const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('base64');

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length
        && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

router.post('/line', (req, res) => {
    if (!process.env.LINE_CHANNEL_SECRET) {
        return res.status(503).json({ success: false, msg: 'LINE webhook is not configured' });
    }
    if (!hasValidLineSignature(req)) {
        return res.status(401).json({ success: false, msg: 'Invalid LINE signature' });
    }

    const events = Array.isArray(req.body?.events) ? req.body.events : [];
    events.forEach((event) => {
        console.log('📩 LINE Event:', event.type, '| User ID:', event.source?.userId);
    });

    return res.sendStatus(200);
});

module.exports = router;
