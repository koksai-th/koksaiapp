# รายงานตรวจสอบและปรับโครงสร้าง — KOKSAI RESCUE

วันที่ตรวจสอบ: 29 กรกฎาคม 2026

## สรุปผล

โปรเจ็กเดิมมีไฟล์ทั้งหมด 87 ไฟล์ ขนาดประมาณ 22.6 MB (ไม่นับ `node_modules` และ `dist`) หลังปรับโครงสร้างเหลือ 69 ไฟล์ ขนาดประมาณ 11.4 MB โดยยังคง asset หลักและฟังก์ชันที่ใช้งานจริงไว้

## ปัญหาระดับวิกฤตที่แก้แล้ว

1. `src/main.jsx` import `AppErrorBoundary.jsx` แต่ไฟล์ไม่มี ทำให้แอป build ไม่ผ่าน
2. `src/App.jsx` lazy import `AdminPage` และ `AmbulancesAdminPage` แต่ไฟล์ไม่มี
3. `package.json` เรียก `scripts/source-audit.cjs` แต่ไม่มีสคริปต์ดังกล่าว
4. migration ไทม์ไลน์สองชุดใช้ชื่อคอลัมน์และ RPC คนละมาตรฐาน ทำให้ frontend กับฐานข้อมูล drift
5. หน้า Personnel โหลดคนละตารางกับข้อมูลที่ `App.jsx` เตรียมไว้ เป็นสาเหตุหนึ่งที่หน้าแสดงข้อมูลว่าง
6. หน้า Admin เดิมไม่มีตารางรองรับข่าว สไลด์ รถพยาบาล และค่าตั้งระบบ
7. หน้า Dashboard ใช้สไลด์ hard-code จึงไม่สะท้อนข้อมูลที่แก้จาก Admin
8. ไฟล์ `.env` และข้อมูลชั่วคราวจาก Supabase ถูกแนบมากับ ZIP ซึ่งไม่ควรเผยแพร่

## สิ่งที่สร้างหรือเพิ่ม

- `src/components/AppErrorBoundary.jsx`
- `src/pages/AdminPage.jsx`
- `src/pages/AmbulancesAdminPage.jsx`
- `src/pages/IncidentDetailPanel.jsx`
- `src/pages/UsersAdminPage.jsx`
- `src/lib/adminResources.js`
- `scripts/source-audit.cjs`
- `supabase/migrations/20260729000000_admin_content.sql`
- `README.md`
- `supabase/README.md`
- `docs/FUNCTION_REFERENCE.md`
- `docs/AUDIT_REPORT.md`

## ไฟล์และโค้ดที่ลบ

### ไฟล์ source ที่ไม่ถูกเรียกใช้

- `src/components/InstallButton.jsx`
- `src/lib/incidentTimeline.js`
- `src/pages/IncidentDetailPage.jsx`
- `src/pages/NotificationInboxPage.jsx`
- `src/utils/requestPermissions.js`

### ไฟล์ซ้ำหรือ config ซ้ำ

- `public/manifest.json` (คง `manifest.webmanifest`)
- asset logo/icon/background ที่ซ้ำหลายตำแหน่ง
- `capacitor.config.json` (คง `capacitor.config.ts`)
- `vite.config.pwa.js` (คง `vite.config.js`)
- SQL schema/migration ที่ซ้ำหรือขัดกัน
- `supabase/storage_policy.sql` ที่อ้าง bucket ชื่อเก่าผิดกับโค้ด

### ไฟล์ที่ไม่ควรส่งต่อ

- `.env`
- `supabase/.temp/*`
- `node_modules`
- `dist`

## การปรับโครงสร้างสำคัญ

- แยกหน้ารายละเอียดเหตุและหน้าจัดการผู้ใช้ออกจาก `App.jsx`
- รวมฟังก์ชันข้อความแจ้งเหตุไว้ที่ `src/lib/core.js` เพียงจุดเดียว
- หน้า Personnel รองรับ `personnel_cards`, ตาราง `personnel` รุ่นเดิม และ fallback จาก `profiles`
- หน้า Dashboard โหลดข่าว สไลด์ และค่าตั้งระบบจาก Supabase และใช้สไลด์ใน `public/slides` เป็น fallback
- ใช้แพ็กเกจ Firebase เฉพาะ `@firebase/app` และ `@firebase/messaging` แทนแพ็กเกจรวม เพื่อลด dependency ที่ไม่เกี่ยวข้อง
- เพิ่ม source audit สำหรับตรวจ import ที่หาย, merge marker, script ที่ชี้ไฟล์ไม่มี, ไฟล์ลับ และ source ที่ไม่ reachable

## ผลการตรวจสอบ

- Source import/reachability audit: ผ่าน
- JavaScript/JSX syntax parse ด้วย TypeScript compiler: ผ่าน
- ตรวจ hash ไฟล์ซ้ำ: ไม่พบไฟล์ซ้ำแบบ byte-for-byte ในชุดส่งมอบ
- Production build: ยังยืนยันไม่ได้ใน environment นี้ เนื่องจาก package registry ภายในตอบ HTTP 503 ระหว่างดาวน์โหลด dependency (`vite`) แม้ package-lock ผ่านการตรวจความสอดคล้องแล้ว

## ข้อจำกัดที่ต้องทดสอบในระบบจริง

การเชื่อมต่อต่อไปนี้ต้องใช้ credential และ infrastructure จริง จึงไม่ควรอ้างว่าทดสอบครบจากไฟล์เพียงอย่างเดียว:

- Supabase Auth, RLS, Realtime, Storage และ RPC
- LINE Messaging API
- Firebase Cloud Messaging foreground/background
- Capacitor Push Notification บนอุปกรณ์ Android
- migration บนฐานข้อมูล production ที่มีข้อมูลเดิม

ก่อน deploy ให้สำรองฐานข้อมูล รัน migration ตาม `supabase/README.md` แล้วทดสอบด้วยบัญชีแต่ละ role
