# KN Shop

เว็บขายสินค้าและบริการเกม Roblox ใช้ frontend แบบ HTML/CSS/JavaScript และ backend แบบ Express + MongoDB

## เริ่มต้นใช้งาน

ต้องมี Node.js 18+ และ MongoDB จากนั้นรัน:

```powershell
cd server
Copy-Item .env.example .env
npm ci
npm start
```

เปิด `http://localhost:5000` และตั้งค่าความลับจริงใน `server/.env` ห้าม commit ไฟล์นี้

รันทดสอบ:

```powershell
cd server
npm test -- --runInBand
```

## โครงสร้างหลัก

```text
index.html                 หน้าแรก
pages/                     HTML ของแต่ละหน้า (โครงสร้างเท่านั้น)
css/style.css              จุดรวม CSS ผ่าน @import
css/core.css               token, reset และ layout พื้นฐาน
css/components/            component ที่ใช้ร่วมกัน
css/pages/                 style เฉพาะหน้า
js/app.js                  API client, auth, cart และ helper กลาง
js/script.js               logic เฉพาะหน้าแรก
js/pages/                  logic เฉพาะหน้า
server/app.js              ประกอบ Express middleware และ routes
server/server.js           entry point ขนาดเล็ก
server/bootstrap/          เชื่อม DB, seed และเปิด HTTP/HTTPS
server/routes/             HTTP endpoints แยกตามโดเมน
server/services/           business/bootstrap services
server/models/             Mongoose models
server/middleware/         auth, validation, CSRF, WAF, rate limit
server/tests/              integration/validation tests
server/uploads/            ไฟล์ runtime ที่ฐานข้อมูลอาจอ้างถึง
docs/                      เอกสารระบบและการดูแล
```

อ่านรายละเอียดการไหลของระบบที่ [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) และรายการไฟล์ที่ต้องระวังที่ [docs/MAINTENANCE.md](docs/MAINTENANCE.md)

## Environment ที่จำเป็น

- `MONGODB_URI`, `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- `BASE_URL` และ `CORS_ORIGIN` เมื่อ frontend อยู่คนละ origin
- `ADMIN_PASSWORD` สำหรับสร้าง admin ครั้งแรกใน production
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- Facebook: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_CALLBACK_URL`
- LINE: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`

ดูรายการเต็มและค่าตัวอย่างใน `server/.env.example`

## Deploy บน Render

`render.yaml` กำหนด build, start และ health check ไว้แล้ว หลังแก้ environment ให้ตรวจว่า callback ตรงทุกตัวอักษร:

- Google: `https://kn-shop.onrender.com/api/auth/google/callback`
- Facebook: `https://kn-shop.onrender.com/api/auth/facebook/callback`

ก่อน deploy ให้รัน test และตรวจ `git diff --check` ทุกครั้ง

