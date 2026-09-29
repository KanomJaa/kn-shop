# 🛡️ KN Shop — Security Documentation v1.1.0

## รายการฟีเจอร์ความปลอดภัยทั้งหมด (20+ ระบบ)

---

### 1. ✅ การเข้ารหัสรหัสผ่าน (Password Hashing)
- **เทคโนโลยี:** bcrypt (12 rounds)
- **ไฟล์:** `server/models/User.js`
- **วิธีทำงาน:** ทุกครั้งที่บันทึกรหัสผ่าน ระบบจะ hash ด้วย bcrypt 12 rounds โดยอัตโนมัติ
- **ประโยชน์:** ต่อให้ฐานข้อมูลหลุด แฮ็กเกอร์ก็ไม่สามารถอ่านรหัสผ่านจริงได้
- **เพิ่มเติม:** `password` field ถูกซ่อนจาก JSON output ด้วย `toJSON()` method

### 2. ✅ ระบบยืนยันตัวตน (JWT Authentication) — ปรับปรุงใหม่ ⭐
- **เทคโนโลยี:** JSON Web Token (JWT)
- **ไฟล์:** `server/middleware/auth.js`
- **Access Token:** อายุ **15 นาที** (สั้น — ป้องกันถ้า token หลุด)
- **Refresh Token:** อายุ **7 วัน** เก็บใน **httpOnly cookie**
- **Error Code:** ส่ง `code: 'TOKEN_EXPIRED'` เมื่อ token หมดอายุ ให้ frontend รู้ว่าต้อง refresh
- **ข้อดีของ httpOnly cookie:**
  - JavaScript อ่าน cookie ไม่ได้ → ป้องกัน XSS ขโมย token
  - `sameSite: 'strict'` → ป้องกัน CSRF
  - `secure: true` ใน production → ส่งผ่าน HTTPS เท่านั้น
- **Endpoints:**
  | Method | Endpoint | หน้าที่ |
  |--------|----------|--------|
  | POST | `/api/auth/refresh-token` | ขอ access token ใหม่ |
  | POST | `/api/auth/logout` | ลบ refresh cookie |

### 3. ✅ Token Versioning — ใหม่ ⭐
- **ไฟล์:** `server/models/User.js` (field: `tokenVersion`)
- **วิธีทำงาน:** เมื่อเปลี่ยนรหัสผ่าน หรือ reset password → `tokenVersion += 1`
- **ผลลัพธ์:** Refresh Token ทั้งหมดของ user ถูก invalidate ทันที
- **Use Case:** ถ้ามีคนรู้รหัสผ่าน → เปลี่ยนรหัส → kick ออกจากทุกอุปกรณ์

### 4. ✅ Input Validation — ใหม่ ⭐
- **เทคโนโลยี:** express-validator
- **ไฟล์:** `server/middleware/validate.js`
- **ครอบคลุม:**
  | Endpoint | กฎ Validation |
  |----------|--------------|
  | Register | username 3-30 ตัว, email valid, password ≥ 6 |
  | Login | emailOrUsername ต้องไม่ว่าง |
  | Change Password | currentPassword + newPassword ≥ 6 |
  | Forgot Password | email valid |
  | Verify OTP | email valid + code 6 หลัก |
  | Reset Password | email + resetToken + newPassword ≥ 6 |
  | Checkout | items array ≥ 1, productId = MongoId, qty 1-100 |
  | Topup | amount 1-100,000, method = 'bank', slipImage ต้องมี |
  | Admin Points | id = MongoId, amount ≠ 0 |
  | Admin Product | title ต้องมี, price ≥ 0, categoryId = MongoId |
  | Admin Category | name + slug ต้องมี |
- **ป้องกัน:**
  - ส่ง email ผิดรูปแบบ
  - ราคาติดลบ
  - MongoId ปลอม (MongoDB Injection)
  - Username มีอักขระพิเศษ (XSS)

### 5. ✅ Rate Limiting (IP-based)
- **เทคโนโลยี:** express-rate-limit
- **ไฟล์:** `server/app.js`
- **กฎ:**
  | Endpoint | Limit |
  |----------|-------|
  | API ทั่วไป | 100 req/min |
  | Auth (Login/Register) | 10 req/min |
  | OTP (Forgot Password) | 5 req/10 min |
  | Cloudflare mode | ดึง IP จริงจาก `CF-Connecting-IP` |

### 6. ✅ User-based Rate Limiting — ใหม่ ⭐
- **ไฟล์:** `server/middleware/userRateLimit.js`
- **วิธีทำงาน:** Rate limit ตาม `userId + path` (ไม่ใช่แค่ IP)
- **กฎ:**
  | Endpoint | Limit |
  |----------|-------|
  | Checkout | 5 ครั้ง/นาที ต่อ user |
  | Topup | 5 ครั้ง/5 นาที ต่อ user |
  | Profile Update | 10 ครั้ง/นาที ต่อ user |
- **Auto Cleanup:** ลบ entries หมดอายุทุก 5 นาที
- **Response:** HTTP 429 + `Retry-After` header
- **หมายเหตุ:** In-memory store (production ควรย้ายไป Redis)

### 7. ✅ CSRF Protection — ใหม่ ⭐
- **เทคโนโลยี:** Double Submit Cookie Pattern
- **ไฟล์:** `server/middleware/csrf.js`
- **วิธีทำงาน:**
  1. Server สร้าง CSRF token → ส่งใน cookie (`csrfToken`)
  2. Client อ่าน cookie → ส่งกลับใน header `X-CSRF-Token`
  3. Server ตรวจว่า cookie token = header token
- **ข้าม verify เมื่อ:**
  - ใช้ `Bearer` token (JWT-based auth ไม่เสี่ยง CSRF)
  - Safe methods: GET, HEAD, OPTIONS
  - OAuth callbacks

### 8. ✅ MongoDB Transaction — ใหม่ ⭐
- **ไฟล์:** `server/routes/orders.js`
- **วิธีทำงาน:** Checkout process ทั้งหมดอยู่ใน 1 Transaction:
  1. หัก Point ของ user (`$inc`)
  2. สร้าง Order document
  3. สร้าง Transaction record
  4. ลด Stock ของสินค้า + อัปเดต `soldCount`
- **ถ้าขั้นตอนใดล้มเหลว:** Rollback ทั้งหมด (ไม่มีข้อมูลหลุด)
- **Fallback:** ถ้า MongoDB ไม่ได้ใช้ Replica Set → ใช้ atomic `$inc` แทน (non-transactional)
- **ป้องกัน:**
  - กดซื้อซ้ำซ้อน → Point หักคั่ง
  - Stock ติดลบ
  - Order สร้างแต่ไม่หัก Point

### 9. ✅ Secure File Upload + Magic Bytes — ใหม่ ⭐
- **ไฟล์:** `server/routes/upload.js`
- **ขั้นที่ 1 — Extension Check:** อนุญาตเฉพาะ `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- **ขั้นที่ 2 — Size Limit:** สูงสุด 5MB ต่อไฟล์
- **ขั้นที่ 3 — Magic Bytes Check:** ⭐
  - อ่าน 8 bytes แรกของไฟล์
  - เทียบกับ signature จริง:
    | Format | Magic Bytes |
    |--------|------------|
    | JPEG | `FF D8 FF` |
    | PNG | `89 50 4E 47` |
    | GIF | `47 49 46 38` |
    | WebP | `52 49 46 46` (RIFF) |
  - ถ้าไม่ตรง → **ลบไฟล์ทันที** + คืน error
- **ป้องกัน:** เปลี่ยนนามสกุล `.exe` → `.jpg` แล้วอัปโหลด

### 10. ✅ Email Verification — ใหม่ ⭐
- **ไฟล์:** `server/routes/auth.js`, `server/utils/email.js`, `server/models/User.js`
- **Flow:**
  1. ผู้ใช้สมัครสมาชิก
  2. ระบบสร้าง `emailVerifyToken` (random 32 bytes)
  3. ส่ง Email พร้อมปุ่ม "✅ ยืนยันอีเมล" → ลิงก์ไป `/api/auth/verify-email?token=xxx`
  4. คลิกลิงก์ → `emailVerified = true`
  5. Token หมดอายุใน 24 ชั่วโมง
- **API:**
  | Method | Endpoint | หน้าที่ |
  |--------|----------|--------|
  | GET | `/api/auth/verify-email` | ยืนยันอีเมล |
  | POST | `/api/auth/resend-verify` | ส่งอีเมลยืนยันอีกครั้ง |

### 11. ✅ Helmet (Security Headers)
- **เทคโนโลยี:** helmet.js
- **ไฟล์:** `server/app.js`
- **Headers ที่ตั้งค่า:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security` (HSTS 1 year + preload)
  - `Referrer-Policy: strict-origin-when-cross-origin`

### 12. ✅ Atomic Point Operations
- **ไฟล์:** `server/routes/orders.js`, `server/routes/admin.js`
- **วิธีทำงาน:** ใช้ MongoDB `$inc` operator เพื่อหัก/เพิ่มแต้มใน 1 operation
- **ครอบคลุม:**
  - Checkout: หัก Point + ลด Stock + เพิ่ม soldCount
  - Admin: เพิ่ม/ลด Point ผู้ใช้
- **ประโยชน์:** ป้องกันปัญหาแต้มบั๊กจากการกดซื้อซ้ำซ้อนในเสี้ยววินาที

### 13. ✅ WAF (Web Application Firewall)
- **ไฟล์:** `server/middleware/waf.js`
- **ตรวจจับ:**
  - SQL Injection (`UNION SELECT`, `DROP TABLE`, etc.)
  - XSS (`<script>`, `javascript:`, `onerror=`, etc.)
  - NoSQL Injection (`$gt`, `$regex`, `$where`, etc.)
  - Path Traversal (`../`)
- **บล็อกอัตโนมัติ** พร้อมบันทึก Log
- **False Positive:** ปรับ pattern ให้เข้มงวดขึ้น — ต้องมี context ก่อน (ไม่ block slashes ทั่วไป)

### 14. ✅ MongoDB Sanitization
- **เทคโนโลยี:** express-mongo-sanitize
- **วิธีทำงาน:** ลบ `$` และ `.` ใน request body/query/params เพื่อป้องกัน NoSQL Injection

### 15. ✅ HPP (HTTP Parameter Pollution)
- **เทคโนโลยี:** hpp
- **วิธีทำงาน:** ป้องกันการส่ง parameter ซ้ำใน query string เพื่อ bypass logic

### 16. ✅ Mass Assignment Protection
- **ไฟล์:** `server/routes/admin.js`
- **วิธีทำงาน:** Whitelist fields สำหรับ Category/Banner update
- **ป้องกัน:** ส่ง `role: "admin"` หรือ field อื่นที่ไม่ควรแก้ไขได้

### 17. ✅ Error Information Protection
- **ครอบคลุม:** ทุก routes (auth, orders, admin, payment)
- **วิธีทำงาน:** ไม่ส่ง `err.message` กลับ client — log เฉพาะ server-side
- **ป้องกัน:** แฮ็กเกอร์เห็น stack trace, path ระบบ, ชื่อ column DB

### 18. ✅ Admin Ban Check
- **ไฟล์:** `server/middleware/auth.js`
- **วิธีทำงาน:** ตรวจ `isBanned` ทั้ง `auth` middleware และ `adminAuth` middleware
- **ผลลัพธ์:** Admin ที่ถูก ban จะเข้าถึงระบบไม่ได้แม้มี admin role

### 19. ✅ OTP Password Reset
- **ไฟล์:** `server/routes/auth.js`, `server/models/OTP.js`, `server/utils/email.js`
- **Flow:**
  1. ผู้ใช้กรอกอีเมล → ตรวจสอบว่ามีในระบบ
  2. สร้างรหัส OTP 6 หลัก → บันทึกใน MongoDB (หมดอายุ 10 นาที)
  3. ส่ง OTP ไปยังอีเมลผ่าน Nodemailer (HTML template สวยงาม)
  4. ผู้ใช้กรอก OTP → ตรวจสอบ (สูงสุด 5 ครั้ง)
  5. OTP ถูกต้อง → สร้าง Reset Token (purpose: `reset_verified`)
  6. กรอกรหัสผ่านใหม่ + Reset Token → เปลี่ยนรหัสสำเร็จ
- **Rate Limit:** สูงสุด 3 OTP requests / 10 นาที / email

### 20. ✅ Action Logging
- **ไฟล์:** `server/utils/logger.js`, `server/models/ActionLog.js`
- **บันทึก:** เข้าสู่ระบบ, สมัครสมาชิก, เปลี่ยนรหัส, เติมเงิน, ซื้อสินค้า, Admin actions
- **ข้อมูลที่เก็บ:** ใคร, ทำอะไร, เมื่อไหร่, IP, User Agent, metadata
- **API:** `GET /api/admin/action-logs` (Admin only)

### 21. ✅ Social Login (Google & Facebook)
- **เทคโนโลยี:** Passport.js + OAuth 2.0
- **ไฟล์:** `server/config/passport.js`
- **การตั้งค่า:**
  ```env
  GOOGLE_CLIENT_ID=your-client-id
  GOOGLE_CLIENT_SECRET=your-secret
  FACEBOOK_APP_ID=your-app-id
  FACEBOOK_APP_SECRET=your-secret
  ```

### 22. ✅ Cloudflare Protection
- **การตั้งค่า:** `TRUST_PROXY=true` ใน `.env`
- **ฟีเจอร์:**
  - ดึง IP จริงจาก `CF-Connecting-IP` header
  - ซ่อน IP ของเซิร์ฟเวอร์
  - ป้องกัน DDoS

### 23. ✅ SSL/HTTPS
- **ไฟล์:** `server/bootstrap/startServer.js`
- **การตั้งค่า:**
  ```env
  SSL_ENABLED=true
  SSL_CERT_PATH=./ssl/fullchain.pem
  SSL_KEY_PATH=./ssl/privkey.pem
  ```
- **ฟีเจอร์:** HTTP → HTTPS redirect อัตโนมัติ

---

## 🧪 Automated Testing — ใหม่ ⭐

### Test Stack
| เทคโนโลยี | การใช้งาน |
|-----------|----------|
| **Jest** | Test Runner + Assertions |
| **Supertest** | HTTP API Testing |
| **mongodb-memory-server** | In-memory MongoDB สำหรับ Test |

### Test Suites
| Suite | ไฟล์ | Tests | ครอบคลุม |
|-------|------|-------|---------|
| Auth | `tests/auth.test.js` | 22 | Register (7), Login (6), Auth Middleware (3), Refresh Token (2), Logout (1) |
| Validation | `tests/validation.test.js` | 13 | Register Rules (5), Topup Rules (5), Checkout Rules (3) |
| **รวม** | — | **35** | **ทั้งหมดผ่าน** ✅ |

### วิธีรัน
```bash
cd server
npm test
```

---

## 📖 API Documentation (Swagger) — ใหม่ ⭐

- **URL:** `http://localhost:5000/api-docs`
- **ไฟล์:** `server/config/swagger.js`
- **ข้อมูลครอบคลุม:**
  - Auth: Register, Login, Refresh Token, Me
  - Payment: Topup, Balance
  - Orders: Checkout
  - Products: List
  - System: Health Check
- **Authentication:** ใส่ JWT token ใน Swagger UI ได้เลย (Authorize button)

---

## 📧 การตั้งค่า Email (สำหรับ OTP + Email Verify)

### วิธีที่ 1: Gmail App Password (แนะนำสำหรับเริ่มต้น)
1. ไปที่ https://myaccount.google.com/apppasswords
2. สร้าง App Password สำหรับ "Mail"
3. ตั้งค่าใน `.env`:
   ```env
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```

### วิธีที่ 2: SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxx
```

### Dev Mode (ไม่ต้องตั้งค่า)
- ระบบใช้ Ethereal Email อัตโนมัติ
- ดูอีเมลที่ URL ที่แสดงใน console
- ใช้ได้ทั้ง OTP และ Email Verification

---

## 🔑 การตั้งค่า Google OAuth

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. สร้าง OAuth 2.0 Client ID
3. ตั้ง Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
4. ตั้งค่าใน `.env`

## 📘 การตั้งค่า Facebook OAuth

1. ไปที่ [Facebook Developers](https://developers.facebook.com/apps/)
2. สร้าง App → Products → Facebook Login
3. ตั้ง Valid OAuth Redirect URI: `http://localhost:5000/api/auth/facebook/callback`
4. ตั้งค่าใน `.env`

---

## 🔒 SSL Certificate

### Let's Encrypt (Production)
```bash
sudo certbot certonly --standalone -d your-domain.com
```

### Self-signed (Development)
```bash
mkdir ssl
openssl req -x509 -newkey rsa:4096 -keyout ssl/privkey.pem -out ssl/fullchain.pem -days 365 -nodes
```

---

## 🌐 Cloudflare Setup

1. เพิ่มโดเมนใน Cloudflare
2. เปลี่ยน Nameserver ไปยัง Cloudflare
3. เปิด Proxy Status เป็น "Proxied" (☁️)
4. ตั้ง `TRUST_PROXY=true` ใน `.env`
5. ตั้ง SSL/TLS mode เป็น "Full (strict)"

---

## 📝 Security Changelog

### v1.1.0 (22 กุมภาพันธ์ 2026)
- ⭐ Input Validation ทุก endpoint (express-validator)
- ⭐ Refresh Token System (httpOnly cookie)
- ⭐ Token Versioning (revoke on password change)
- ⭐ CSRF Protection (Double Submit Cookie)
- ⭐ MongoDB Transaction (Atomic Checkout)
- ⭐ Magic Bytes File Validation
- ⭐ Email Verification
- ⭐ Per-User Rate Limiting
- ⭐ Automated Testing (35 tests)
- ⭐ Swagger API Documentation
- ⭐ Health Check Endpoint

### v1.0.0
- ✅ Password Hashing (bcrypt 12 rounds)
- ✅ JWT Authentication
- ✅ IP Rate Limiting
- ✅ Helmet Security Headers
- ✅ Atomic Operations ($inc)
- ✅ WAF (SQL/XSS/NoSQL/Path Traversal)
- ✅ MongoDB Sanitization
- ✅ Mass Assignment Protection
- ✅ Error Info Protection
- ✅ Action Logging
- ✅ OTP Password Reset
- ✅ Social Login (Google/Facebook)

---

> 📝 สร้างโดย KN Shop Development Team  
> 📅 อัปเดตล่าสุด: 22 กุมภาพันธ์ 2026
