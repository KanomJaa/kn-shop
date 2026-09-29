# คู่มือดูแลไฟล์

## ไฟล์ที่ใช้งานจริง

- `index.html`, `pages/`, `css/`, `js/` คือ frontend ที่ server เปิดให้สาธารณะ
- `server/server.js` และ `server/app.js` คือ entry/composition ของ backend
- `server/routes`, `models`, `middleware`, `services`, `utils`, `config` คือ source backend
- `server/tests` คือ automated tests ปัจจุบัน
- `render.yaml` คือ deployment definition ของ Render

## ไฟล์ compatibility

ไฟล์ต่อไปนี้ดูเหมือนซ้ำแต่ยังเก็บไว้เพื่อไม่ให้ URL/bookmark เก่าเสีย:

- `pages/game-products.html`
- `pages/products-animeadventures.html`
- `pages/products-bladeball.html`
- `pages/products-bloxfruits.html`
- `pages/products-brookhaven.html`
- `pages/products-dahood.html`
- `pages/products-kinglegacy.html`
- `pages/products-petsim99.html`
- `pages/products-ttd.html`

ทั้งหมด redirect ผ่านไฟล์เดียวคือ `js/pages/category-redirect.js` ห้ามใส่ logic ร้านค้าซ้ำในไฟล์เหล่านี้

## สิ่งที่ยังไม่ควรลบอัตโนมัติ

- `server/uploads/` — ชื่อไฟล์อาจถูกเก็บใน MongoDB จึงต้องเทียบข้อมูล production ก่อนลบ
- `se-boilerplate-main/` — starter project ที่ไม่ถูกอ้างอิงและถูก ignore โดย Git ถือว่าเป็นผู้สมัครสำหรับการลบ แต่ต้องได้รับอนุญาตให้ลบโฟลเดอร์นี้โดยตรงก่อน
- `.claude/` — tooling ส่วนตัวและถูก ignore ไม่เกี่ยวกับ runtime

## ขั้นตอนก่อน merge/deploy

1. รัน `npm test -- --runInBand` ภายใน `server/`
2. รัน `node --check` กับ JavaScript ที่แก้
3. ตรวจว่า local assets ใน HTML มีอยู่จริง
4. รัน `git diff --check`
5. ตรวจ environment/callback ของ Render, Google และ Facebook
6. ทดสอบ login, checkout, top-up และ admin บน staging/production ตามความเหมาะสม

## หลักการเพิ่มโค้ด

- หน้าใหม่: HTML อยู่ `pages/`, CSS อยู่ `css/pages/`, JS อยู่ `js/pages/`
- component ที่ใช้หลายหน้า: CSS อยู่ `css/components/`; helper JavaScript กลางอยู่ `js/app.js`
- endpoint ใหม่: เพิ่ม route ตามโดเมน ไม่เพิ่ม logic กลับไปใน `server/server.js`
- logic ที่ไม่เกี่ยวกับ HTTP: วางใน `server/services/` หรือ `server/utils/`
- เพิ่ม validation และ test ทุกครั้งที่รับข้อมูลจากผู้ใช้

