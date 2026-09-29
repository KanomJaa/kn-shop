# สถาปัตยกรรม KN Shop

## Request flow

```text
Browser
  ├─ /, /pages, /css, /js ───────────────> static frontend
  ├─ /api/* ─> security middleware ──────> domain route ─> model ─> MongoDB
  └─ /webhook/line ─> LINE signature ────> webhook route
```

`server/app.js` มีหน้าที่ประกอบแอปเท่านั้น ส่วนการเชื่อมฐานข้อมูล การ seed และการเปิด port อยู่ใน `server/bootstrap/startServer.js` ทำให้ tests โหลด Express app ได้โดยไม่เปิด server จริง

## Frontend

- HTML ใน `pages/` เก็บ markup และอ้าง asset ภายนอก ไม่มี `<script>` หรือ `<style>` แบบ block ในไฟล์
- `css/style.css` เป็น entry point ที่ import `core`, `components`, `pages` และ `responsive` ตามลำดับ
- `js/app.js` เป็นของใช้ร่วมกัน เช่น API client, access token, refresh token, cart และ escaping helper
- JavaScript เฉพาะหน้าอยู่ใน `js/pages/`; หน้า admin แยกตามโดเมนใน `js/pages/admin/`
- ไฟล์ `products-*.html` และ `game-products.html` เป็น compatibility redirects สำหรับ URL เก่า โดยใช้ `js/pages/category-redirect.js` ร่วมกัน

## Backend

- `server/routes/auth.js` — account, token, email verification, Google/Facebook OAuth
- `server/routes/products.js`, `categories.js`, `banners.js` — public catalog
- `server/routes/orders.js`, `payment.js` — checkout, wallet และ top-up
- `server/routes/admin.js` — admin-only operations และ action logs
- `server/routes/upload.js` — image upload ที่ตรวจชนิดไฟล์
- `server/routes/system.js` — health และข้อมูลระบบที่ป้องกันด้วย admin auth
- `server/routes/webhooks.js` — LINE webhook ที่ตรวจ HMAC signature ก่อน CSRF middleware

API ที่ไม่พบจะคืน JSON 404 ส่วน path ที่ดูเป็นไฟล์แต่ไม่ได้อนุญาตจะคืน 404 เพื่อไม่เปิดเผย source/config จาก workspace

## Checkout consistency

ระบบพยายามใช้ MongoDB transaction ก่อน หาก MongoDB แบบ standalone ไม่รองรับ จะใช้ atomic update และ compensation rollback สำหรับ points, stock, sold count และ order ที่สร้างค้างอยู่ Production ควรใช้ MongoDB replica set เพื่อรับประกัน atomicity เต็มรูปแบบ

## ขอบเขตความปลอดภัย

- browser requests ใช้ JWT และ CSRF ตามชนิด request
- OAuth access token กลับมาทาง URL fragment เพื่อลดการบันทึกใน server logs/history
- external data ที่ render เป็น HTML ต้องผ่าน `KNShop.escapeHTML`; URL ต้องผ่าน `KNShop.safeUrl`
- ห้าม mount repository root เป็น static directory
- webhook จาก provider ต้องใช้ signature ของ provider ไม่ใช้ browser CSRF token

