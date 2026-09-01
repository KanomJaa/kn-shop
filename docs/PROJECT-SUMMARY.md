# 🎮 KN Shop — สรุปโปรเจคทั้งหมด

> **เว็บไซต์จำหน่ายไอเทมและบริการเกม Roblox ครบวงจร**  
> พัฒนาด้วย HTML/CSS/JavaScript + Node.js + MongoDB

---

## 📋 สารบัญ
1. [ภาพรวมโปรเจค](#1-ภาพรวมโปรเจค)
2. [เทคโนโลยีที่ใช้](#2-เทคโนโลยีที่ใช้)
3. [โครงสร้างไฟล์](#3-โครงสร้างไฟล์)
4. [ระบบทั้งหมด](#4-ระบบทั้งหมด)
5. [ระบบความปลอดภัย](#5-ระบบความปลอดภัย)
6. [หน้าเว็บทั้งหมด](#6-หน้าเว็บทั้งหมด)
7. [API Endpoints](#7-api-endpoints)
8. [Database Models](#8-database-models)
9. [การตั้งค่า Environment](#9-การตั้งค่า-environment)
10. [Testing & Tools](#10-testing--tools)

---

## 1. ภาพรวมโปรเจค

| รายการ | รายละเอียด |
|--------|-----------|
| **ชื่อโปรเจค** | KN Shop |
| **Version** | 1.1.0 |
| **ประเภท** | E-Commerce สำหรับเกม Roblox |
| **ธีมสี** | ขาว + ฟ้าอ่อน (Light Blue) |
| **ภาษา** | ไทย |
| **สถาปัตยกรรม** | Client-Server (REST API) |
| **ฐานข้อมูล** | MongoDB (Mongoose ODM) |
| **Port** | 5000 |
| **API Docs** | `/api-docs` (Swagger UI) |
| **Health Check** | `/api/health` |

---

## 2. เทคโนโลยีที่ใช้

### Frontend
| เทคโนโลยี | การใช้งาน |
|-----------|----------|
| **HTML5** | โครงสร้างหน้าเว็บ |
| **CSS3** | Styling, Animation, Responsive Design |
| **Vanilla JavaScript** | Logic, API calls, DOM manipulation |
| **Font Awesome 6.4** | ไอคอน |
| **Google Fonts (Kanit)** | ฟอนต์ภาษาไทย |

### Backend
| เทคโนโลยี | การใช้งาน |
|-----------|----------|
| **Node.js** | Runtime |
| **Express.js** | Web Framework |
| **MongoDB** | Database |
| **Mongoose** | ODM (Object Data Modeling) |
| **JWT (jsonwebtoken)** | Authentication (Access Token 15m + Refresh Token 7d) |
| **bcryptjs** | Password Hashing (12 rounds) |
| **cookie-parser** | Parse cookies (Refresh Token, CSRF) |
| **express-validator** | Input Validation ทุก endpoint |
| **Multer** | File Upload (สลิป, รูปสินค้า) + Magic Bytes Check |
| **Nodemailer** | ส่ง Email (OTP + Email Verify) |
| **Passport.js** | OAuth (Google, Facebook) |
| **Helmet** | Security Headers |
| **express-rate-limit** | IP-based Rate Limiting |
| **express-mongo-sanitize** | NoSQL Injection Protection |
| **hpp** | HTTP Parameter Pollution Protection |
| **Morgan** | HTTP Request Logging |
| **swagger-jsdoc** | API Documentation Schema |
| **swagger-ui-express** | Interactive API Docs UI |
| **uuid** | Unique ID Generation |

### Dev/Testing
| เทคโนโลยี | การใช้งาน |
|-----------|----------|
| **Jest** | Test Runner |
| **Supertest** | HTTP API Testing |
| **mongodb-memory-server** | In-memory MongoDB สำหรับ Test |
| **Nodemon** | Auto-restart Development Server |

---

## 3. โครงสร้างไฟล์

```
KN Shop/
├── 📄 index.html                    # หน้าแรก
├── 📄 login.html                    # เข้าสู่ระบบ
├── 📄 register.html                 # สมัครสมาชิก
├── 📄 forgot-password.html          # ลืมรหัสผ่าน (OTP)
├── 📄 profile.html                  # โปรไฟล์ผู้ใช้
├── 📄 wallet.html                   # กระเป๋าเงิน + เติมเงิน
├── 📄 topup.html                    # หน้าเติมเงิน (redirect)
├── 📄 cart.html                     # ตะกร้าสินค้า
├── 📄 order-history.html            # ประวัติสั่งซื้อ
├── 📄 product-detail.html           # รายละเอียดสินค้า
├── 📄 products.html                 # สินค้าตามหมวดหมู่
├── 📄 robux.html                    # เติม Robux
├── 📄 gamepass.html                 # บริการกดเกมพาส
├── 📄 products-bloxfruits.html      # สินค้า Blox Fruits
├── 📄 products-petsim99.html        # สินค้า Pet Sim 99
├── 📄 products-kinglegacy.html      # สินค้า King Legacy
├── 📄 products-animeadventures.html # สินค้า Anime Adventures
├── 📄 products-ttd.html             # สินค้า Toilet Tower Defense
├── 📄 products-bladeball.html       # สินค้า Blade Ball
├── 📄 products-brookhaven.html      # สินค้า Brookhaven
├── 📄 products-dahood.html          # สินค้า Da Hood
├── 📄 game-products.html            # สินค้าเกมทั่วไป
├── 📄 admin.html                    # หน้า Admin Dashboard
├── 🎨 style.css                     # CSS หลัก (2,000+ บรรทัด)
├── 📜 app.js                        # Frontend API Client (KNShop object)
├── 📜 script.js                     # Homepage Logic
├── 📄 SECURITY.md                   # เอกสารความปลอดภัย
├── 📄 PROJECT-SUMMARY.md            # ไฟล์นี้
├── 📄 .gitignore                    # Git ignore rules
│
└── server/                          # Backend
    ├── 📜 server.js                 # Entry point + Express setup + Security Middleware
    ├── 📄 .env                      # Environment Variables (อย่า commit!)
    ├── 📄 .env.example              # ตัวอย่าง Environment Variables
    ├── 📄 package.json              # Dependencies
    ├── 📄 jest.config.js            # ⭐ Jest Test Configuration
    │
    ├── config/
    │   ├── 📜 db.js                 # MongoDB Connection
    │   ├── 📜 passport.js           # OAuth Configuration
    │   └── 📜 swagger.js            # ⭐ Swagger API Documentation Config
    │
    ├── middleware/
    │   ├── 📜 auth.js               # JWT Auth + Admin Auth + Refresh Token System
    │   ├── 📜 waf.js                # Web Application Firewall
    │   ├── 📜 validate.js           # ⭐ Input Validation Rules (express-validator)
    │   ├── 📜 csrf.js               # ⭐ CSRF Protection (Double Submit Cookie)
    │   └── 📜 userRateLimit.js      # ⭐ Per-User Rate Limiting
    │
    ├── models/
    │   ├── 📜 User.js               # ผู้ใช้ (+ emailVerified, tokenVersion)
    │   ├── 📜 Product.js            # สินค้า
    │   ├── 📜 Category.js           # หมวดหมู่
    │   ├── 📜 Order.js              # คำสั่งซื้อ
    │   ├── 📜 Transaction.js        # ธุรกรรมเงิน
    │   ├── 📜 Review.js             # รีวิว
    │   ├── 📜 OTP.js                # รหัส OTP
    │   ├── 📜 Banner.js             # แบนเนอร์
    │   └── 📜 ActionLog.js          # Log การทำงาน
    │
    ├── routes/
    │   ├── 📜 auth.js               # สมัคร/เข้าสู่ระบบ/OAuth/Refresh/EmailVerify
    │   ├── 📜 products.js           # CRUD สินค้า
    │   ├── 📜 categories.js         # หมวดหมู่
    │   ├── 📜 orders.js             # สั่งซื้อ (MongoDB Transaction)
    │   ├── 📜 payment.js            # เติมเงิน/ประวัติ
    │   ├── 📜 admin.js              # จัดการ Admin
    │   └── 📜 upload.js             # อัปโหลดรูป/สลิป (Magic Bytes Check)
    │
    ├── utils/
    │   ├── 📜 email.js              # ส่ง Email (OTP + Email Verification)
    │   └── 📜 logger.js             # Action Logger (บันทึกลง MongoDB)
    │
    ├── tests/                       # ⭐ Automated Tests
    │   ├── 📜 setup.js              # Test DB Setup (MongoDB Memory Server)
    │   ├── 📜 auth.test.js          # Auth API Tests (22 tests)
    │   └── 📜 validation.test.js    # Validation Tests (13 tests)
    │
    └── uploads/                     # ไฟล์ที่อัปโหลด
```

> ⭐ = ไฟล์ใหม่ที่เพิ่มใน v1.1.0

---

## 4. ระบบทั้งหมด

### 🔐 4.1 ระบบสมาชิก (Authentication)
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **สมัครสมาชิก** | ชื่อผู้ใช้ + อีเมล + รหัสผ่าน (Input Validation) |
| **เข้าสู่ระบบ** | Username/Email + Password |
| **Google Login** | OAuth 2.0 ผ่าน Google |
| **Facebook Login** | OAuth 2.0 ผ่าน Facebook |
| **ลืมรหัสผ่าน** | ส่ง OTP 6 หลัก ไปทาง Email → ยืนยัน → ตั้งรหัสใหม่ |
| **Access Token** | ⭐ JWT อายุ 15 นาที (สั้น — ปลอดภัยกว่า) |
| **Refresh Token** | ⭐ อายุ 7 วัน เก็บใน httpOnly cookie ป้องกัน XSS |
| **Token Refresh** | ⭐ `POST /api/auth/refresh-token` ขอ access token ใหม่ |
| **Email Verification** | ⭐ ส่งลิงก์ยืนยันอีเมลหลังสมัคร (หมดอายุ 24 ชม.) |
| **Password Hashing** | bcrypt 12 rounds |
| **Password Strength** | แสดง meter ความแข็งแรงของรหัสผ่าน |
| **Token Versioning** | ⭐ เปลี่ยนรหัสผ่าน → Invalidate Refresh Token ทั้งหมด |

### 💰 4.2 ระบบ Point (กระเป๋าเงิน)
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **สกุลเงิน** | Point (1 Point = 1 บาท) |
| **ช่องทางเติม** | โอนธนาคาร (SCB) |
| **บัญชีรับโอน** | SCB 3562673038 ชื่อ ชัยธวัช พรหมแก้ว |
| **PromptPay** | ❌ ปิดปรับปรุง |
| **TrueMoney** | ❌ ปิดปรับปรุง |
| **การอนุมัติ** | ✅ Admin ตรวจสอบสลิปแล้วอนุมัติเท่านั้น |
| **สลิป** | บังคับแนบรูปสลิปทุกครั้ง (อัปโหลดไฟล์) |
| **จำกัด** | pending ได้ไม่เกิน 3 รายการ |
| **ตัวเลือกจำนวน** | 50, 100, 200, 500, 1,000, 2,000, 5,000, 10,000 Point |
| **Input Validation** | ⭐ จำนวน 1–100,000, method ต้องเป็น 'bank' |
| **User Rate Limit** | ⭐ สูงสุด 5 ครั้ง / 5 นาที ต่อ user |

### 🛒 4.3 ระบบสั่งซื้อ
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **ตะกร้าสินค้า** | เพิ่ม/ลบ/ปรับจำนวน |
| **สั่งซื้อ** | หัก Point (Atomic Operation + MongoDB Transaction) |
| **MongoDB Transaction** | ⭐ หัก Point + สร้าง Order + ลด Stock เป็น atomic ทั้งหมด |
| **Transaction Fallback** | ⭐ ถ้า MongoDB ไม่มี Replica Set จะใช้ atomic $inc แทน |
| **คิวสั่งซื้อ** | ระบบคิว Queue Number |
| **สถานะ** | pending → processing → completed / failed |
| **ประวัติ** | ดูประวัติสั่งซื้อทั้งหมด |
| **กรอก Roblox Username** | จำเป็นต้องกรอกก่อนซื้อ |
| **Input Validation** | ⭐ ตรวจ productId (MongoId), qty (1–100) |
| **User Rate Limit** | ⭐ สูงสุด 5 ครั้ง / นาที ต่อ user |

### 📦 4.4 ระบบสินค้า
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **หมวดหมู่** | แบ่งตามเกม (Blox Fruits, Pet Sim 99, etc.) |
| **สินค้า** | ชื่อ, ราคา, คำอธิบาย, รูปภาพ, สต๊อก |
| **กรองสินค้า** | ตามหมวดหมู่, ตามชื่อ |
| **รายละเอียด** | หน้ารายละเอียดสินค้าแยก |
| **เกมที่รองรับ** | Blox Fruits, Pet Sim 99, King Legacy, Anime Adventures, TTD, Blade Ball, Brookhaven, Da Hood |

### 📤 4.5 ระบบอัปโหลดไฟล์
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **นามสกุล** | .jpg, .jpeg, .png, .gif, .webp เท่านั้น |
| **ขนาด** | สูงสุด 5MB ต่อไฟล์ |
| **Magic Bytes Check** | ⭐ ตรวจ 8 bytes แรกของไฟล์จริง ป้องกันเปลี่ยน .exe → .jpg |
| **Auto Delete** | ⭐ ลบไฟล์อันตรายทันทีถ้าตรวจพบ |
| **Routes** | Admin: `/api/upload/`, User: `/api/upload/slip` |

### 🎯 4.6 ระบบ Admin Dashboard
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **📊 สถิติ** | ยอดขาย, จำนวนผู้ใช้, สินค้า, ออเดอร์ |
| **👥 จัดการผู้ใช้** | ดู/ค้นหา/แก้ไข/ลบผู้ใช้, เพิ่ม/ลด Point |
| **📦 จัดการสินค้า** | เพิ่ม/แก้ไข/ลบสินค้า, อัปโหลดรูป |
| **📂 จัดการหมวดหมู่** | เพิ่ม/แก้ไข/ลบหมวดหมู่ |
| **🛍️ จัดการออเดอร์** | ดู/อัปเดตสถานะออเดอร์ |
| **💳 จัดการเติมเงิน** | ดูรายการเติมเงิน, ดูสลิป, อนุมัติ/ปฏิเสธ |
| **📈 รายงานยอดขาย** | ยอดขายรายวัน/รายเดือน |
| **📋 ดู Log** | ประวัติการทำงานทั้งหมด |

### 💬 4.7 ระบบติดต่อ (Contact)
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **ปุ่มแชทลอย** | ปุ่มสีเขียวมุมขวาล่าง (พร้อม animation) |
| **Popup ติดต่อ** | เด้ง popup เลือก 3 ช่องทาง |
| **Facebook** | ลิงก์ไปหน้า Facebook |
| **Discord** | ลิงก์เข้า Discord Server |
| **Line** | แสดง QR Code + Line ID: @knshop |
| **ปุ่มติดต่อเรา** | กดแล้วเด้ง popup (ไม่เลื่อนหน้า) |

### 📱 4.8 ระบบ Responsive Design
| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| **PC (> 1024px)** | แสดง navbar ปกติ |
| **Tablet/Mobile (≤ 1024px)** | ☰ Hamburger Menu |
| **Mobile Menu** | รวมทุกเมนู: หน้าแรก, เติมเงิน, สินค้า, ติดต่อเรา, เข้าสู่ระบบ, สมัครสมาชิก |
| **ถ้า Login แล้ว** | แสดง ชื่อ + Point + เมนูผู้ใช้ + ออกจากระบบ |

---

## 5. ระบบความปลอดภัย (20 ระบบ)

| # | ระบบ | รายละเอียด | สถานะ |
|---|------|-----------|-------|
| 1 | **Password Hashing** | bcrypt 12 rounds | ✅ เปิดใช้ |
| 2 | **JWT Access Token** | อายุ 15 นาที (สั้น ปลอดภัยกว่า) | ✅ เปิดใช้ |
| 3 | **Refresh Token** | ⭐ อายุ 7 วัน httpOnly cookie (ป้องกัน XSS) | ✅ เปิดใช้ |
| 4 | **Input Validation** | ⭐ express-validator ทุก endpoint | ✅ เปิดใช้ |
| 5 | **IP Rate Limiting** | 100 req/min API, 10 req/min auth, 5 req/10min OTP | ✅ เปิดใช้ |
| 6 | **User Rate Limiting** | ⭐ Checkout 5/min, Topup 5/5min ต่อ user | ✅ เปิดใช้ |
| 7 | **Helmet** | Security HTTP Headers (HSTS, nosniff, etc.) | ✅ เปิดใช้ |
| 8 | **CSRF Protection** | ⭐ Double Submit Cookie Pattern | ✅ เปิดใช้ |
| 9 | **MongoDB Transaction** | ⭐ Atomic checkout (Point + Order + Stock) | ✅ เปิดใช้ |
| 10 | **Atomic Operations** | `$inc` ป้องกัน Race Condition (Checkout + Admin + Stock) | ✅ เปิดใช้ |
| 11 | **Magic Bytes Check** | ⭐ ตรวจเนื้อหาไฟล์จริง ไม่ใช่แค่นามสกุล | ✅ เปิดใช้ |
| 12 | **Email Verification** | ⭐ ส่งลิงก์ยืนยันอีเมลหลังสมัคร | ✅ เปิดใช้ |
| 13 | **Token Versioning** | ⭐ เปลี่ยนรหัส = Revoke Refresh Token ทั้งหมด | ✅ เปิดใช้ |
| 14 | **WAF** | ป้องกัน SQL Injection, XSS, NoSQL, Path Traversal | ✅ เปิดใช้ |
| 15 | **Mass Assignment** | Whitelist fields สำหรับ Category/Banner update | ✅ เปิดใช้ |
| 16 | **Error Info Protection** | ไม่ส่ง err.message กลับ client | ✅ เปิดใช้ |
| 17 | **Admin Ban Check** | ตรวจ isBanned ทั้ง auth และ adminAuth | ✅ เปิดใช้ |
| 18 | **MongoDB Sanitization** | ป้องกัน NoSQL Injection ($, .) | ✅ เปิดใช้ |
| 19 | **HPP** | ป้องกัน HTTP Parameter Pollution | ✅ เปิดใช้ |
| 20 | **Action Logging** | บันทึกทุกกิจกรรมสำคัญ | ✅ เปิดใช้ |
| — | **OTP Password Reset** | ส่ง OTP 6 หลักทาง Email | ✅ เปิดใช้ |
| — | **Google OAuth** | เข้าสู่ระบบด้วย Google | ✅ ตั้งค่าแล้ว |
| — | **Facebook OAuth** | เข้าสู่ระบบด้วย Facebook | ✅ ตั้งค่าแล้ว |
| — | **SSL/HTTPS** | รองรับ SSL Certificate | ⬜ ต้องตั้งค่า |
| — | **Cloudflare** | รองรับ Cloudflare Proxy | ⬜ ต้องตั้งค่า |

> ⭐ = ฟีเจอร์ใหม่ใน v1.1.0

---

## 6. หน้าเว็บทั้งหมด (28 หน้า)

### สำหรับผู้ใช้ทั่วไป
| หน้า | ไฟล์ | หน้าที่ |
|------|------|--------|
| 🏠 หน้าแรก | `index.html` | แสดงสถิติ, หมวดหมู่, สินค้าแนะนำ |
| 🔑 เข้าสู่ระบบ | `login.html` | Login ปกติ + Google + Facebook |
| 📝 สมัครสมาชิก | `register.html` | Register + Social Login |
| 🔒 ลืมรหัสผ่าน | `forgot-password.html` | OTP 3 ขั้นตอน |
| 👤 โปรไฟล์ | `profile.html` | ดู/แก้ไขข้อมูลส่วนตัว |
| 💰 กระเป๋าเงิน | `wallet.html` | ยอด Point, เติมเงิน, แนบสลิป, ประวัติ |
| 🛒 ตะกร้า | `cart.html` | จัดการสินค้าในตะกร้า |
| 📋 ประวัติ | `order-history.html` | ดูคำสั่งซื้อทั้งหมด |
| 📄 รายละเอียด | `product-detail.html` | ข้อมูลสินค้า + ซื้อ |
| 📦 สินค้า | `products.html` | แสดงสินค้าตาม category |

### หน้าสินค้าแยกเกม (8 เกม)
| เกม | ไฟล์ |
|-----|------|
| Blox Fruits | `products-bloxfruits.html` |
| Pet Simulator 99 | `products-petsim99.html` |
| King Legacy | `products-kinglegacy.html` |
| Anime Adventures | `products-animeadventures.html` |
| Toilet Tower Defense | `products-ttd.html` |
| Blade Ball | `products-bladeball.html` |
| Brookhaven | `products-brookhaven.html` |
| Da Hood | `products-dahood.html` |

### หน้าพิเศษ
| หน้า | ไฟล์ |
|------|------|
| เติม Robux | `robux.html` |
| บริการกดเกมพาส | `gamepass.html` |
| สินค้าเกม | `game-products.html` |
| เติมเงิน (redirect) | `topup.html` |
| ⚙️ Admin Dashboard | `admin.html` |

---

## 7. API Endpoints

### 🔐 Authentication (`/api/auth/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| POST | `/register` | สมัครสมาชิก (+ ส่ง Email Verify) |
| POST | `/login` | เข้าสู่ระบบ (ได้ Access + Refresh Token) |
| POST | `/refresh-token` | ⭐ ขอ Access Token ใหม่ด้วย Refresh Token |
| POST | `/logout` | ⭐ ออกจากระบบ (ลบ Refresh Cookie) |
| GET | `/me` | ดูข้อมูลตัวเอง |
| PUT | `/profile` | แก้ไขโปรไฟล์ |
| PUT | `/change-password` | เปลี่ยนรหัสผ่าน (+ Invalidate Refresh Tokens) |
| GET | `/verify-email` | ⭐ ยืนยันอีเมล (คลิกจาก Email) |
| POST | `/resend-verify` | ⭐ ส่งอีเมลยืนยันอีกครั้ง |
| POST | `/forgot-password` | ขอ OTP |
| POST | `/verify-otp` | ยืนยัน OTP |
| POST | `/reset-password` | ตั้งรหัสใหม่ |
| GET | `/google` | Login ผ่าน Google |
| GET | `/google/callback` | Google Callback |
| GET | `/facebook` | Login ผ่าน Facebook |
| GET | `/facebook/callback` | Facebook Callback |

### 💳 Payment (`/api/payment/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| POST | `/topup` | ส่งคำขอเติมเงิน (พร้อมสลิป, rate-limited) |
| GET | `/history` | ประวัติธุรกรรม |
| GET | `/balance` | ยอด Point คงเหลือ |
| GET | `/pending-topups` | รายการ pending ของตัวเอง |

### 📦 Products (`/api/products/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| GET | `/` | ดูสินค้าทั้งหมด |
| GET | `/:id` | ดูรายละเอียดสินค้า |

### 📂 Categories (`/api/categories/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| GET | `/` | ดูหมวดหมู่ทั้งหมด |

### 🛍️ Orders (`/api/orders/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| POST | `/checkout` | สั่งซื้อ (MongoDB Transaction, rate-limited) |
| GET | `/my-orders` | ดูออเดอร์ของตัวเอง |
| GET | `/:id` | ดูออเดอร์เฉพาะ |

### 📤 Upload (`/api/upload/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| POST | `/` | อัปโหลดรูปสินค้า (Admin, Magic Bytes Check) |
| POST | `/slip` | อัปโหลดสลิปการโอน (User, Magic Bytes Check) |

### ⚙️ Admin (`/api/admin/`)
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| GET | `/stats` | สถิติรวม |
| GET | `/users` | รายชื่อผู้ใช้ |
| PUT | `/users/:id` | แก้ไขผู้ใช้ |
| DELETE | `/users/:id` | ลบผู้ใช้ |
| PUT | `/users/:id/points` | เพิ่ม/ลด Point (Atomic) |
| GET | `/products` | รายการสินค้า |
| POST | `/products` | เพิ่มสินค้า |
| PUT | `/products/:id` | แก้ไขสินค้า |
| DELETE | `/products/:id` | ลบสินค้า |
| GET | `/categories` | หมวดหมู่ |
| POST | `/categories` | เพิ่มหมวดหมู่ |
| PUT | `/categories/:id` | แก้ไขหมวดหมู่ (Whitelist fields) |
| DELETE | `/categories/:id` | ลบหมวดหมู่ |
| GET | `/orders` | ออเดอร์ทั้งหมด |
| PUT | `/orders/:id/status` | อัปเดตสถานะ |
| GET | `/topups` | รายการเติมเงิน |
| GET | `/topups/pending-count` | จำนวน pending |
| PUT | `/topups/:id/approve` | อนุมัติเติมเงิน |
| PUT | `/topups/:id/reject` | ปฏิเสธเติมเงิน |
| GET | `/sales-report` | รายงานยอดขาย |
| GET | `/logs` | ดู Action Logs |

### 🔧 System Endpoints
| Method | Endpoint | หน้าที่ |
|--------|----------|--------|
| GET | `/api/health` | ⭐ Health Check (uptime, memory) |
| GET | `/api/security-info` | ข้อมูลระบบความปลอดภัย |
| GET | `/api/banners` | รายการ Banner |
| GET | `/api-docs` | ⭐ Swagger API Documentation (Interactive) |
| GET | `/api-docs.json` | ⭐ OpenAPI Spec (JSON) |

---

## 8. Database Models (9 Models)

### 👤 User
```
username, email, password, role (member/admin), points,
emailVerified ⭐, emailVerifyToken ⭐, emailVerifyExpires ⭐,
tokenVersion ⭐, googleId, facebookId, avatar,
isBanned, banReason, robloxUsername, createdAt
```

### 📦 Product
```
title, description, price, image, imgLabel,
category, categorySlug, stockQty, inStock, isActive,
soldCount, sortOrder, createdAt
```

### 📂 Category
```
name, slug, description, icon, headerColor,
isActive, sortOrder, createdAt
```

### 🛍️ Order
```
orderId, user, username, items[], totalPoints, status,
queueNumber, createdAt
```

### 💳 Transaction
```
user, type (topup/purchase), amount, method,
status (pending/success/failed), note,
slipRef, slipImage, orderId,
approvedBy, approvedAt, rejectedBy, rejectedAt,
createdAt
```

### ⭐ Review
```
user, product, rating, comment, createdAt
```

### 🔑 OTP
```
userId, email, code, purpose (password_reset/reset_verified/email_verify),
attempts, maxAttempts, isUsed, metadata, expiresAt, createdAt
```

### 📋 ActionLog
```
user, action (register/login/purchase/topup_request/topup_approve/topup_reject/...),
details, metadata, ip, userAgent, success, errorMessage, createdAt
```

### 🖼️ Banner
```
title, image, link, isActive, sortOrder, createdAt
```

---

## 9. การตั้งค่า Environment

```env
# Server
PORT=5000
MONGODB_URI=mongodb://localhost:27017/knshop
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
ACCESS_TOKEN_EXPIRES=15m          # ⭐ Access Token อายุ 15 นาที
REFRESH_TOKEN_EXPIRES=7d          # ⭐ Refresh Token อายุ 7 วัน

# Admin
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@knshop.com
ADMIN_PASSWORD=CHANGE_THIS_TO_A_STRONG_PASSWORD

# Email (สำหรับ OTP + Email Verify)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM_NAME=KN Shop
BASE_URL=http://localhost:5000     # ⭐ สำหรับลิงก์ Email Verify

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback

# SSL (optional)
SSL_ENABLED=false
SSL_CERT_PATH=./ssl/fullchain.pem
SSL_KEY_PATH=./ssl/privkey.pem

# Cloudflare (optional)
TRUST_PROXY=false

# CORS
CORS_ORIGIN=*
```

---

## 10. Testing & Tools

### 🧪 Automated Tests
```bash
# รัน test ทั้งหมด
cd server
npm test

# รันแบบ verbose
npx jest --forceExit --verbose

# รันเฉพาะ auth tests
npx jest tests/auth.test.js --forceExit

# รันเฉพาะ validation tests
npx jest tests/validation.test.js --forceExit
```

| Test Suite | จำนวน Tests | ครอบคลุม |
|-----------|------------|---------|
| `auth.test.js` | 22 tests | Register, Login, Auth Middleware, Refresh Token, Logout |
| `validation.test.js` | 13 tests | Register rules, Topup rules, Checkout rules |
| **รวม** | **35 tests** | **ทั้งหมดผ่าน** ✅ |

### 📖 API Documentation
- **Swagger UI:** เปิดเบราว์เซอร์ไปที่ `http://localhost:5000/api-docs`
- **OpenAPI JSON:** `http://localhost:5000/api-docs.json`
- **ครอบคลุม:** Auth, Payment, Orders, Products, Admin, Health

### 🔍 Health Check
```bash
curl http://localhost:5000/api/health
```
Response:
```json
{
  "success": true,
  "status": "healthy",
  "uptime": 12345,
  "version": "1.1.0",
  "memoryUsage": { "rss": "45 MB", "heapUsed": "20 MB" }
}
```

---

## 📊 สถิติโปรเจค

| หัวข้อ | จำนวน |
|--------|-------|
| **ไฟล์ Frontend (HTML)** | 20 ไฟล์ |
| **ไฟล์ CSS** | 1 ไฟล์ (2,000+ บรรทัด) |
| **ไฟล์ JavaScript (Frontend)** | 2 ไฟล์ |
| **ไฟล์ Backend** | 22 ไฟล์ |
| **Database Models** | 9 Models |
| **API Endpoints** | 40+ Endpoints |
| **หน้าเว็บ** | 28 หน้า |
| **เกมที่รองรับ** | 8 เกม |
| **ระบบความปลอดภัย** | 20+ ระบบ |
| **Automated Tests** | 35 tests (2 suites) |
| **Dependencies** | 25+ packages |

---

## 🚀 วิธีรันโปรเจค

```bash
# 1. ติดตั้ง MongoDB แล้วรัน
mongod

# 2. ติดตั้ง dependencies
cd server
npm install

# 3. ตั้งค่า .env (copy จาก .env.example)
cp .env.example .env
# แก้ไขค่าต่างๆ ใน .env

# 4. รันเซิร์ฟเวอร์
node server.js

# 5. เปิดเบราว์เซอร์
# http://localhost:5000

# 6. ดู API Docs
# http://localhost:5000/api-docs

# 7. รัน tests
npm test
```

---

## 👤 ข้อมูลเข้าสู่ระบบ Admin

| Username | Password |
|----------|----------|
| admin | (ตั้งค่าใน .env - ADMIN_PASSWORD) |

---

## 📝 Changelog

### v1.1.0 (22 กุมภาพันธ์ 2026)
- ⭐ **Input Validation** — express-validator ทุก endpoint
- ⭐ **Refresh Token System** — Access Token 15m + Refresh Token 7d httpOnly cookie
- ⭐ **MongoDB Transaction** — Atomic checkout (Point + Order + Stock)
- ⭐ **Magic Bytes File Check** — ตรวจเนื้อหาไฟล์จริงหลัง upload
- ⭐ **Email Verification** — ส่งลิงก์ยืนยันอีเมลหลังสมัคร
- ⭐ **CSRF Protection** — Double Submit Cookie Pattern
- ⭐ **Per-User Rate Limiting** — Rate limit ต่อ user (ไม่ใช่แค่ IP)
- ⭐ **Automated Tests** — 35 tests (Jest + Supertest + MongoDB Memory Server)
- ⭐ **Swagger API Docs** — Interactive API documentation at /api-docs
- ⭐ **Health Check** — `/api/health` endpoint
- ⭐ **Token Versioning** — เปลี่ยนรหัสผ่าน = revoke refresh tokens ทั้งหมด

### v1.0.0
- 🐛 แก้ Bug ทั้ง Critical, Medium, Low
- 🔒 เพิ่ม .gitignore, .env.example
- 🔓 Atomic operations สำหรับ Stock, Points
- 🛡️ WAF false positive fixes
- 🧹 ลบ dead code, unused packages

---

> 📝 สร้างโดย KN Shop Development Team  
> 📅 อัปเดตล่าสุด: 22 กุมภาพันธ์ 2026
