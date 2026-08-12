# Supabase Database Guide

โฟลเดอร์นี้แยก schema ออกเป็น migration ตามลำดับเวลา เพื่อลดปัญหาไฟล์ SQL ซ้ำและ schema drift

## Migration order

1. `20260716000000_production_schema.sql`
   - profiles, personnel_cards, incidents, patients, vehicles, incident_images
   - device_tokens, notifications, case_messages, audit log
   - Auth trigger, RPC, RLS, Storage policy และ Realtime

2. `20260716010000_incident_timeline_notification_inbox.sql`
   - คอลัมน์ `departed_base_at`, `arrived_scene_at`, `transported_at`, `closed_at`
   - `incident_status_events`
   - `notification_recipients`
   - RPC `record_incident_timeline_event`

3. `20260729000000_admin_content.sql`
   - ambulances
   - news
   - dashboard_slides
   - app_settings
   - RLS และข้อมูลเริ่มต้นสำหรับสไลด์/ตั้งค่า

ห้ามใช้ migration รุ่นอื่นที่นิยาม `dispatched_at` หรือ `transport_started_at` ร่วมกับโปรเจ็กนี้ เพราะ frontend ใช้ชื่อคอลัมน์ `departed_base_at` และ `transported_at`

## Existing database

`existing_database/production_hardening.sql` มีไว้ปรับฐานข้อมูลเดิม ควรอ่าน diff และสำรองข้อมูลก่อนรัน ห้ามรันแบบไม่ตรวจสอบบน production

หลัง hardening ให้รัน migration ลำดับ 2 และ 3 เฉพาะส่วนที่ฐานข้อมูลยังไม่มี

## Edge Function secrets

ตั้งค่าด้วย Supabase CLI หรือ Dashboard ห้ามใส่ค่าเหล่านี้ใน frontend:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_GROUP_ID`

## Deploy functions

```bash
supabase functions deploy line-alert
supabase functions deploy send-alert
```

จากนั้นตั้ง secrets และทดสอบด้วยบัญชี authenticated ที่มีสิทธิ์ตาม RLS
