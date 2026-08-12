# โครงสร้างโปรเจ็ก KOKSAI RESCUE

```text
koksaiapp-fixed/
├── public/
│   ├── firebase-messaging-sw.js   Service worker: PWA cache และ background push
│   ├── manifest.webmanifest       ข้อมูลติดตั้ง PWA
│   ├── privacy-policy/            หน้านโยบายความเป็นส่วนตัว
│   └── slides/                    ภาพสไลด์สำรองกรณีฐานข้อมูลไม่มีข้อมูล
├── scripts/
│   └── source-audit.cjs           ตรวจ import, source reachability, secret/generated files
├── src/
│   ├── main.jsx                   entry point และ Error Boundary
│   ├── App.jsx                    auth/session, permission, shared state และ navigation shell
│   ├── index.css                  Tailwind และ global styles
│   ├── pwa.js                     ลงทะเบียน service worker
│   ├── components/
│   │   ├── AppErrorBoundary.jsx   หน้ากู้คืนเมื่อ React runtime error
│   │   ├── IncidentChat.jsx       แชทและรูปภาพประจำเคส
│   │   ├── IncidentTimeline.jsx   ลำดับการปฏิบัติงานของเหตุ
│   │   └── common.jsx             input, section, metric และ map components
│   ├── lib/
│   │   ├── adminResources.js      CRUD helper ที่จำกัดเฉพาะตาราง Admin
│   │   ├── core.js                models เริ่มต้น, วันที่, case ID และข้อความแจ้งเหตุ
│   │   ├── incidents.js           validation, database CRUD และ Storage images
│   │   ├── notifications.js       notification inbox
│   │   ├── deviceTokens.js        device token lifecycle
│   │   ├── firebase.js            Firebase app bootstrap
│   │   ├── pushNotifications.js   Capacitor native push
│   │   ├── lineAlert.js           เรียก Edge Function LINE
│   │   ├── roles.js               role helpers
│   │   └── supabaseClient.js      Supabase client เพียง instance เดียว
│   └── pages/
│       ├── AuthPage.jsx
│       ├── DashboardPage.jsx
│       ├── CommandCenterPage.jsx
│       ├── IncidentFormPage.jsx
│       ├── IncidentDetailPanel.jsx
│       ├── NotificationsPage.jsx
│       ├── ReportPage.jsx
│       ├── PersonnelPage.jsx
│       ├── UsersAdminPage.jsx
│       ├── AmbulancesAdminPage.jsx
│       └── AdminPage.jsx
├── supabase/
│   ├── migrations/                schema หลัก เรียงตาม timestamp
│   ├── functions/                 line-alert และ send-alert
│   ├── existing_database/         hardening สำหรับฐานข้อมูลเดิม
│   └── README.md                  ลำดับ migration และ secrets
├── docs/
│   ├── AUDIT_REPORT.md            ปัญหาที่พบ สิ่งที่แก้ และข้อจำกัดการทดสอบ
│   ├── FUNCTION_REFERENCE.md      คำอธิบายฟังก์ชัน/คอมโพเนนต์ทั้งหมดที่มีชื่อ
│   └── PROJECT_STRUCTURE.md       เอกสารฉบับนี้
├── .env.example                   template ตัวแปร frontend เท่านั้น
├── package.json
├── package-lock.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## เส้นทางข้อมูลหลัก

1. `main.jsx` render `App` ภายใต้ `AppErrorBoundary`
2. `App.jsx` ตรวจ Supabase session และโหลด `profiles`
3. `RescueAppShell` กำหนดเมนูตาม role และโหลด incidents/personnel/users/notifications
4. หน้าจอใน `src/pages` รับข้อมูลและ callback จาก shell; งานฐานข้อมูล reusable อยู่ใน `src/lib`
5. การสร้างหรือแก้เคสผ่าน `src/lib/incidents.js`; รูปเก็บใน private Storage และแสดงผ่าน signed URL
6. LINE/FCM ที่ต้องใช้ secret ทำงานใน `supabase/functions` ไม่ทำงานใน browser
7. ข่าว สไลด์ รถพยาบาล และ settings จัดการผ่านหน้า Admin และตารางจาก migration `20260729000000_admin_content.sql`

## ขอบเขตความรับผิดชอบ

- `App.jsx`: orchestration เท่านั้น ไม่ควรเพิ่ม SQL/Storage logic ใหม่ลงไป
- `pages/`: UI และ state เฉพาะหน้า
- `components/`: UI ที่ใช้ซ้ำหรือมี lifecycle แยก
- `lib/`: validation, mapping และ infrastructure access
- `supabase/`: schema, RLS, RPC และ server-side secrets

การเพิ่มฟังก์ชันใหม่ควรอยู่ในโมดูลที่รับผิดชอบโดยตรง เพื่อลดการย้อนกลับไปทำให้ `App.jsx` กลายเป็นไฟล์รวมทุกอย่างอีกครั้ง
