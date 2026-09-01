// ================================================================
//  Line Messaging API — ส่งแจ้งเตือนผ่าน Line
// ================================================================

const LINE_API_URL = 'https://api.line.me/v2/bot/message/broadcast';

/**
 * ส่งข้อความแจ้งเตือนไปยัง Line (broadcast ถึงทุกคนที่เพิ่มบอท)
 * @param {string} message - ข้อความที่จะส่ง
 * @returns {Object} { success: boolean, error?: string }
 */
async function sendLineNotify(message) {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!token) {
        console.warn('⚠️ LINE not configured — skipping notification');
        return { success: false, error: 'LINE not configured' };
    }

    try {
        const res = await fetch(LINE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                messages: [{ type: 'text', text: message }],
            }),
        });

        if (!res.ok) {
            const err = await res.json();
            console.error('❌ LINE send error:', err);
            return { success: false, error: err.message || 'LINE API error' };
        }

        console.log('✅ LINE notification sent');
        return { success: true };
    } catch (err) {
        console.error('❌ LINE send error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * แจ้งเตือนออเดอร์ใหม่
 */
function notifyNewOrder(order, username) {
    const msg = `🛒 ออเดอร์ใหม่!\n\n👤 ลูกค้า: ${username}\n📦 สินค้า: ${order.items?.length || 0} รายการ\n💰 ยอดรวม: ${order.totalPrice?.toLocaleString() || 0} P\n🕐 เวลา: ${new Date().toLocaleString('th-TH')}`;
    return sendLineNotify(msg);
}

/**
 * แจ้งเตือนเติมเงิน
 */
function notifyTopup(username, amount) {
    const msg = `💳 เติมเงินใหม่!\n\n👤 ผู้ใช้: ${username}\n💰 จำนวน: ${amount.toLocaleString()} P\n🕐 เวลา: ${new Date().toLocaleString('th-TH')}`;
    return sendLineNotify(msg);
}

/**
 * แจ้งเตือนสมาชิกใหม่
 */
function notifyNewUser(username, email) {
    const msg = `👋 สมาชิกใหม่!\n\n👤 ชื่อ: ${username}\n📧 อีเมล: ${email}\n🕐 เวลา: ${new Date().toLocaleString('th-TH')}`;
    return sendLineNotify(msg);
}

module.exports = { sendLineNotify, notifyNewOrder, notifyTopup, notifyNewUser };
