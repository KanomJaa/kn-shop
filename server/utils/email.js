// ================================================================
//  Email Service — ส่งอีเมล OTP ด้วย Nodemailer
// ================================================================

const nodemailer = require('nodemailer');

// Create reusable transporter
// รองรับ Gmail, SendGrid, Mailgun, หรือ SMTP ทั่วไป
const createTransporter = () => {
    // ถ้าตั้งค่า SMTP
    if (process.env.SMTP_HOST) {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    // ถ้าใช้ Gmail App Password
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    }

    // The caller decides whether to use a local/test transport or fail closed.
    return null;
};

let transporter = null;

const getTransporter = async () => {
    if (transporter) return transporter;

    transporter = createTransporter();
    if (transporter) return transporter;

    // Tests must be deterministic and must never contact an external mail service.
    if (process.env.NODE_ENV === 'test') {
        transporter = nodemailer.createTransport({ jsonTransport: true });
        return transporter;
    }

    // In production, silently sending to Ethereal would make verification/OTP
    // emails inaccessible to real users. Require an explicitly configured service.
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Email service is not configured');
    }

    // Development-only fallback: create an Ethereal preview mailbox.
    console.warn('⚠️ No email service configured. Using Ethereal preview mailbox.');
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
    console.log('📧 Using Ethereal test email:', testAccount.user);
    return transporter;
};

/**
 * Send OTP email for password reset
 * @param {string} toEmail - Recipient email
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} username - User's username
 * @returns {Object} { success: boolean, previewUrl?: string }
 */
async function sendOTPEmail(toEmail, otpCode, username = 'ลูกค้า') {
    try {
        const mailer = await getTransporter();
        const fromName = process.env.EMAIL_FROM_NAME || 'KN Shop';
        const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@knshop.com';

        const info = await mailer.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: toEmail,
            subject: `🔑 รหัส OTP สำหรับรีเซ็ตรหัสผ่าน - ${fromName}`,
            html: `
                <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <div style="background: linear-gradient(135deg, #1e88e5, #0d47a1); border-radius: 16px; padding: 32px; text-align: center; color: white;">
                        <h1 style="margin: 0 0 8px; font-size: 28px;">🎮 KN Shop</h1>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">ร้านขายไอเทมเกม #1</p>
                    </div>

                    <div style="background: white; border-radius: 16px; padding: 32px; margin-top: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                        <h2 style="color: #1e88e5; margin-top: 0;">สวัสดี คุณ${username} 👋</h2>
                        <p style="color: #555; line-height: 1.6;">คุณได้ขอรีเซ็ตรหัสผ่าน กรุณาใช้รหัส OTP ด้านล่างนี้:</p>

                        <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                            <p style="color: #999; margin: 0 0 8px; font-size: 13px;">รหัส OTP ของคุณ</p>
                            <h1 style="font-size: 42px; letter-spacing: 12px; color: #1e88e5; margin: 0; font-weight: 700;">${otpCode}</h1>
                        </div>

                        <div style="background: #fff3e0; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
                            <p style="color: #e65100; margin: 0; font-size: 13px;">
                                ⏰ <strong>รหัสนี้จะหมดอายุใน 10 นาที</strong><br>
                                ⚠️ อย่าแชร์รหัสนี้ให้ผู้อื่น
                            </p>
                        </div>

                        <p style="color: #999; font-size: 12px; line-height: 1.5;">
                            หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้<br>
                            รหัสจะหมดอายุโดยอัตโนมัติ
                        </p>
                    </div>

                    <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 16px;">
                        © ${new Date().getFullYear()} KN Shop — อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `,
            text: `KN Shop - รหัส OTP สำหรับรีเซ็ตรหัสผ่าน\n\nสวัสดี คุณ${username}\nรหัส OTP ของคุณคือ: ${otpCode}\n\nรหัสนี้จะหมดอายุใน 10 นาที\nอย่าแชร์รหัสนี้ให้ผู้อื่น\n\nหากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้`,
        });

        // Show preview URL for Ethereal test emails
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log('📧 Preview OTP email:', previewUrl);
        }

        return { success: true, previewUrl: previewUrl || null };
    } catch (err) {
        console.error('❌ Email send error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Send email verification link
 * @param {string} toEmail - Recipient email
 * @param {string} token - Verification token
 * @param {string} username - User's username
 */
async function sendVerifyEmail(toEmail, token, username = 'ลูกค้า') {
    try {
        const mailer = await getTransporter();
        const fromName = process.env.EMAIL_FROM_NAME || 'KN Shop';
        const fromEmail = process.env.EMAIL_FROM || process.env.GMAIL_USER || 'noreply@knshop.com';
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
        const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

        const info = await mailer.sendMail({
            from: `"${fromName}" <${fromEmail}>`,
            to: toEmail,
            subject: `📧 ยืนยันอีเมลของคุณ - ${fromName}`,
            html: `
                <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                    <div style="background: linear-gradient(135deg, #1e88e5, #0d47a1); border-radius: 16px; padding: 32px; text-align: center; color: white;">
                        <h1 style="margin: 0 0 8px; font-size: 28px;">🎮 KN Shop</h1>
                        <p style="margin: 0; opacity: 0.9; font-size: 14px;">ร้านขายไอเทมเกม #1</p>
                    </div>
                    <div style="background: white; border-radius: 16px; padding: 32px; margin-top: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                        <h2 style="color: #1e88e5; margin-top: 0;">สวัสดี คุณ${username} 👋</h2>
                        <p style="color: #555; line-height: 1.6;">กรุณากดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ:</p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${verifyUrl}" style="background: linear-gradient(135deg, #1e88e5, #0d47a1); color: white; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                                ✅ ยืนยันอีเมล
                            </a>
                        </div>
                        <p style="color: #999; font-size: 12px;">ลิงก์นี้จะหมดอายุใน 24 ชั่วโมง</p>
                    </div>
                    <p style="text-align: center; color: #aaa; font-size: 11px; margin-top: 16px;">
                        © ${new Date().getFullYear()} KN Shop — อีเมลนี้ส่งอัตโนมัติ กรุณาอย่าตอบกลับ
                    </p>
                </div>
            `,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) console.log('📧 Preview verify email:', previewUrl);
        return { success: true, previewUrl: previewUrl || null };
    } catch (err) {
        console.error('❌ Verify email send error:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendOTPEmail, sendVerifyEmail };
