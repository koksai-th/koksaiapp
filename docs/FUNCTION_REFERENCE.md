# Function Reference — KOKSAI RESCUE

เอกสารนี้อธิบายหน้าที่ของฟังก์ชันและคอมโพเนนต์ที่มีชื่อในโปรเจ็กหลังปรับโครงสร้างแล้ว ฟังก์ชัน callback ขนาดเล็กที่เขียนแบบ inline ใน JSX จะอธิบายรวมอยู่กับคอมโพเนนต์เจ้าของ

## `src/main.jsx`

- จุดเริ่มต้นของเว็บ โหลด CSS, ลงทะเบียน PWA, ตรวจ `#root` และ render `<App />` ภายใต้ React Strict Mode และ Error Boundary

## `src/components/AppErrorBoundary.jsx`

- `AppErrorBoundary`: ดัก runtime error ที่หลุดจาก component tree เพื่อไม่ให้หน้าจอขาว
- `getDerivedStateFromError`: เก็บ error ลง state เพื่อสลับไปหน้าข้อผิดพลาด
- `componentDidCatch`: บันทึกรายละเอียด error และ component stack ลง console
- `handleReload`: โหลดหน้าใหม่เมื่อผู้ใช้กดปุ่ม
- `render`: แสดง children ตามปกติ หรือแสดงหน้ากู้คืนเมื่อเกิด error

## `src/App.jsx`

### Loading และ style

- `LoadingScreenStyle`: inject keyframes ของหน้า loading หลัก
- `LoadingScreen`: หน้า loading เต็มจอระหว่างตรวจ session/profile
- `PageLoading`: fallback ระหว่างโหลดหน้าที่ใช้ `React.lazy`
- `EmergencyHeaderAlertBar`: แถบหัวข้อฉุกเฉินบนหน้าล็อกอินศูนย์สั่งการ
- `EmergencyHeaderStyle`: CSS เฉพาะแถบหัวข้อฉุกเฉิน
- `CommandCenterLoginEmbeddedStyle`: CSS สำหรับ AuthPage ที่ฝังในหน้าศูนย์สั่งการ
- `UIScaleStyle`: CSS สำหรับปรับขนาด UI ตาม viewport
- `HeaderGlowStyle`: CSS effect ของ header
- `RescueOperationalStyle`: CSS ภาพรวมของ shell และ mobile layout

### Social links

- `openExternalLink`: เปิด URL ภายนอกแบบ `noopener,noreferrer`
- `openLineSmart`: เลือกวิธีเปิด LINE ตาม mobile/desktop และมี fallback
- `openSocialLink`: route การกดปุ่ม social ไปยัง handler ที่เหมาะสม
- `SocialBrandIcon`: render SVG icon ของ Facebook, Messenger หรือ LINE

### การจัดรูปแบบเหตุ

- `formatCommandShortDate`: แปลงวันที่เป็นรูปแบบไทยแบบสั้น
- `getCommandCaseTypeLabel`: แปลงรหัสประเภทเคสเป็นข้อความไทย
- `buildCommandCenterMessage`: สร้างข้อความแจ้งเหตุสำหรับ copy/LINE จาก command draft

### Deep link และ URL state

- `getNotificationIdFromUrl`: อ่าน notification ID จาก query string
- `getIncidentTargetFromUrl`: อ่าน incident ID จาก query string/deep link
- `openIncidentDetail`: เขียน incident ID ลง URL แล้วเปิดหน้ารายละเอียด
- `closeIncidentDetail`: ล้าง incident ID จาก URL และกลับหน้าหลัก
- `syncFromUrl`: sync state เมื่อ browser back/forward
- `handleServiceWorkerMessage`: รับข้อความจาก service worker แล้วเปิดเคสหรือ refresh notification

### Component หลัก

- `CommandCenterLoginScreen`: landing/login screen สำหรับศูนย์สั่งการ
- `RescueAppShell`: shell หลังล็อกอิน รวม state, data loading, navigation และ business flow
- `RestrictedAccountScreen`: แจ้งบัญชียังไม่อนุมัติหรือถูกปิดใช้งาน
- `App`: ตรวจ session, โหลด profile และเลือกหน้าล็อกอิน/จำกัดสิทธิ์/แอปหลัก

### Push notification

- `getDeviceToken`: ขอ permission และสร้าง FCM token ฝั่งเว็บ
- `notifyError`: แจ้ง error ผ่าน alert หรือ console ตามโหมด silent
- `checkSavedDeviceToken`: ตรวจ token ที่บันทึกไว้ของผู้ใช้
- `setupForegroundMessaging`: รับ FCM ขณะเปิดหน้าเว็บและแสดง notification
- `refreshUnread`: โหลดจำนวน notification ที่ยังไม่อ่าน
- `sendCommandPushNotification`: เรียก Edge Function เพื่อส่ง push หลังสร้างเคส
- `sendCommandNotifications`: ส่งการแจ้งเตือนจากศูนย์สั่งการไปกลุ่มเป้าหมาย

### Incident data และ form

- `loadIncidentDetail`: โหลดเคสเดียวจาก Supabase
- `assignNextCaseId`: ขอเลขเคสถัดไปจาก RPC
- `resetFormWithNextCaseId`: รีเซ็ตฟอร์มแล้วขอเลขเคสใหม่
- `reloadIncidents`: โหลดรายการเคสทั้งหมด
- `updateField`: อัปเดต field ระดับบนของฟอร์ม
- `updateVehicle`: อัปเดตรถใน array ตาม index
- `updatePatient`: อัปเดตผู้ป่วยใน array ตาม index
- `addVehicle`: เพิ่มรายการรถเปล่า
- `addPatient`: เพิ่มรายการผู้ป่วยเปล่า
- `removeVehicle`: ลบรถตาม index โดยคงอย่างน้อยหนึ่งรายการ
- `removePatient`: ลบผู้ป่วยตาม index โดยคงอย่างน้อยหนึ่งรายการ
- `handleFiles`: ตรวจชนิด/ขนาด/จำนวนรูป แล้วเพิ่มลงฟอร์ม
- `removeImage`: ลบรูปจากฟอร์มและติดตามรูปเดิมที่ต้องลบจาก Storage
- `handleSubmit`: validate แล้วสร้างหรือแก้ไขเคส
- `saveCommandDraftAsIncident`: เปลี่ยน command draft เป็น incident จริง
- `editIncident`: โหลด incident เข้า form เพื่อแก้ไข
- `cancelEditing`: ออกจากโหมดแก้ไขและรีเซ็ตฟอร์ม
- `removeIncident`: ยืนยันและลบเคสพร้อมรูปที่เกี่ยวข้อง
- `recordTimelineEventFromApp`: บันทึกขั้นตอนปฏิบัติงานผ่าน RPC แล้ว refresh ข้อมูล
- `cancelIncidentFromCommand`: ยกเลิกเคสจาก command center
- `loadIncidentIntoCommand`: นำข้อมูลเคสเดิมไปใช้ในศูนย์สั่งการ

### Personnel และ users

- `mapPersonnelCardRow`: แปลง `personnel_cards + profiles` เป็น model กลางของหน้า UI
- `mapLegacyPersonnelRow`: แปลงข้อมูลตาราง `personnel` รุ่นเดิมเป็น model กลาง
- `reloadPersonnel`: โหลดจาก `personnel_cards`; หากไม่มีข้อมูลจึงลอง `personnel`; สุดท้าย fallback ไป `profiles`
- `reloadUsers`: โหลด profile สำหรับหน้าจัดการผู้ใช้
- `changeUserRole`: ยืนยันและเปลี่ยน role
- `changeUserStation`: ยืนยันและเปลี่ยนพื้นที่รับผิดชอบ
- `changeUserStatus`: อนุมัติหรือปิดบัญชี

### GPS

- `normalizeCoordinate`: แปลง input พิกัดให้เป็น number ที่ตรวจสอบได้
- `extractCoordinates`: ดึง lat/lng จากหลายรูปแบบของ Geolocation/Map event
- `normalizePair`: ตรวจช่วง latitude/longitude และคืน object มาตรฐาน
- `getGPS`: ขอพิกัดจาก browser geolocation
- `updateMapLocation`: อัปเดตพิกัดฟอร์มบันทึกเคส
- `updateCommandLocation`: อัปเดตพิกัดศูนย์สั่งการ

### LINE, copy, report, logout และ navigation

- `sendCurrentCommandToLine`: ส่ง command message ไป LINE ผ่าน Edge Function
- `copyAlert`: copy ข้อความแจ้งเหตุไป clipboard
- `printPdf`: สร้างหน้าพิมพ์สำหรับรายงานที่เลือก
- `handleLogout`: sign out และล้าง state ที่เกี่ยวข้อง
- `dismissInstallBanner`: ซ่อน banner ติดตั้ง PWA
- `handleInstallApp`: เรียก browser install prompt
- `renderNavButton`: render ปุ่มเมนู sidebar
- `renderSidebarBottomActions`: render ปุ่มล่าง sidebar เช่น notification/logout
- `renderFloatingSocialMenu`: render ปุ่ม social แบบ floating
- `applyResponsiveScale`: เลือก CSS scale class ตามขนาดจอ
- `handleBeforeInstallPrompt`: เก็บ deferred PWA install event
- `handleAppInstalled`: ปิด banner หลังติดตั้งสำเร็จ
- `closeOnEscape`: ปิด modal/sidebar ด้วยปุ่ม Escape
- `forceLoginScreen`: ล้าง session state และบังคับกลับหน้า login
- `loadProfile`: โหลด profile ของ user ที่ล็อกอิน
- `init`: เริ่มต้น Supabase auth listener และ session

## `src/components/IncidentChat.jsx`

- `formatMessageTime`: จัดรูปแบบเวลาข้อความ
- `signChatImage`: สร้าง signed URL ของรูปแชทใน private bucket
- `hydrateMessage`: เติม signed URL ให้ message row
- `IncidentChat`: UI แชทของเคสและ realtime subscription
- `loadMessages`: โหลดข้อความทั้งหมดของเคส
- `sendMessage`: validate, upload รูป (ถ้ามี) และ insert ข้อความ

## `src/components/IncidentTimeline.jsx`

- `getIncidentStatusLabel`: แปลง status code เป็นข้อความไทย
- `formatTimelineDateTime`: จัดรูปแบบเวลาของแต่ละขั้นตอน
- `canRecordStep`: ตรวจว่า step ถัดไปกดได้ตามลำดับและสถานะหรือไม่
- `IncidentTimeline`: แสดง 4 ขั้นตอนและปุ่มบันทึกเวลา

## `src/components/common.jsx`

- `MetricCard`: การ์ดตัวเลขสถิติแบบใช้ซ้ำ
- `SectionShell`: container มาตรฐานของแต่ละ section
- `Input`: input มาตรฐานที่รับค่า callback แบบ value
- `Select`: select มาตรฐาน
- `PickHandler`: component ภายใน Leaflet สำหรับรับ map click
- `RecenterMap`: recenter แผนที่เมื่อ position เปลี่ยน
- `MapPicker`: UI เลือกพิกัดพร้อม marker

## `src/lib/adminResources.js`

- `assertAllowedTable`: จำกัด generic admin helper ให้ใช้เฉพาะตารางที่อนุญาต
- `loadAdminRows`: โหลดรายการจากตาราง admin พร้อม order/limit
- `saveAdminRow`: insert หรือ update ตามการมี `id`
- `deleteAdminRow`: ลบแถวตาม `id`
- `loadAdminCounts`: นับแถวของ profiles, personnel, ambulances, news และ slides
- `loadAppSettings`: โหลด key/value จาก `app_settings`
- `saveAppSettings`: upsert การตั้งค่าหลาย key ในครั้งเดียว

## `src/lib/core.js`

- `emptyVehicle`: สร้าง object รถเปล่า
- `emptyPatient`: สร้าง object ผู้ป่วยเปล่า
- `pad`: เติมเลขศูนย์ด้านหน้า
- `getCurrentYear`: คืนปี ค.ศ. ปัจจุบัน
- `getCurrentDate`: คืนวันที่ปัจจุบันแบบ `YYYY-MM-DD`
- `getCurrentTime`: คืนเวลาปัจจุบันแบบ `HH:mm`
- `getMonthKey`: แปลงวันที่เป็น `YYYY-MM`
- `parseGps`: parse และ validate ข้อความ `lat,lng`
- `getDefaultCenter`: คืนพิกัดศูนย์กลางเริ่มต้น
- `getCaseId`: สร้างเลขเคสชั่วคราวฝั่ง client
- `createInitialForm`: สร้าง state เริ่มต้นของฟอร์มเคส
- `createAlertDraft`: สร้าง state เริ่มต้นของศูนย์แจ้งเหตุ
- `buildAlertMessage`: สร้างข้อความแจ้งเหตุจาก incident row
- `getCaseTypeLabel`: helper ภายใน `buildAlertMessage` สำหรับชื่อประเภทเคส

## `src/lib/dateUtils.js`

- `formatThaiDate`: แสดงวันที่ไทยแบบเต็ม
- `formatThaiDateShort`: แสดงวันที่ไทยแบบสั้น
- `convertThaiDisplayToIso`: แปลงวันที่แสดงผลกลับเป็น ISO date เมื่อทำได้

## `src/lib/deviceTokens.js`

- `detectPlatform`: ตรวจ web/android/ios
- `saveDeviceTokenForUser`: upsert token พร้อม platform, station และ last-seen
- `getActiveDeviceTokenForUser`: โหลด active token ล่าสุดของผู้ใช้
- `deactivateDeviceToken`: ปิด token ที่เลิกใช้

## `src/lib/firebase.js`

- ตรวจว่าค่า Firebase ขั้นต่ำครบหรือไม่
- สร้างหรือ reuse Firebase app instance ผ่านแพ็กเกจย่อย `@firebase/app`
- export `firebaseApp`; ถ้าค่าไม่ครบจะปิด web messaging อย่างปลอดภัย

## `src/lib/incidents.js`

- `validateIncidentForm`: คืน array ข้อผิดพลาดของ form
- `assertValidIncidentForm`: throw เมื่อ form ไม่ผ่าน validation
- `isBrowserFile`: ตรวจ object ว่าเป็น browser `File`
- `getStoredPath`: ดึง storage path จาก string/object รูป
- `removeStoredImages`: ลบ path ที่ไม่ซ้ำจาก Storage
- `safeImageExtension`: เลือกนามสกุลรูปที่ปลอดภัยจากชื่อ/MIME
- `uploadImages`: validate และ upload รูป พร้อม rollback เมื่อบางรูปผิดพลาด
- `hydrateStoredImage`: สร้าง signed URL ให้รูปเดียว
- `hydrateIncidentRow`: เติม signed URL ให้รูปใน incident row
- `hydrateRowsInBatches`: สร้าง signed URL แบบ batch ลดจำนวน request
- `formToRow`: แปลง form model เป็น database row และ upload รูป
- `incidentRowToForm`: แปลง database row กลับเป็น form model
- `loadIncidentsFromDb`: โหลด incidents แบบ pagination แล้ว hydrate รูป
- `getNextCaseIdFromDb`: เรียก RPC `next_case_id`
- `createIncidentInDb`: สร้าง incident และ cleanup รูปเมื่อ insert ล้มเหลว
- `updateIncidentInDb`: อัปเดต incident, cleanup รูปใหม่เมื่อผิดพลาด และลบรูปเก่าหลังสำเร็จ
- `createQuickIncidentInDb`: สร้าง incident จาก command draft
- `recordIncidentTimelineEvent`: เรียก RPC บันทึก step ของไทม์ไลน์
- `deleteIncidentFromDb`: ลบ incident แล้วลบรูปใน Storage

## `src/lib/lineAlert.js`

- `sendLineAlert`: เรียก Supabase Edge Function `line-alert` พร้อมข้อความและ case ID

## `src/lib/notifications.js`

- `loadInboxNotifications`: โหลดกล่องแจ้งเตือนของผู้ใช้ผ่าน `notification_recipients`
- `getUnreadNotificationCount`: นับรายการที่ `read_at` เป็น null
- `markNotificationRead`: mark รายการเดียวว่าอ่านแล้ว
- `markAllNotificationsRead`: mark ทุกรายการของผู้ใช้ว่าอ่านแล้ว

## `src/lib/pushNotifications.js`

- `registerListenersOnce`: ลงทะเบียน Capacitor push listeners เพียงครั้งเดียว
- `initPushNotifications`: ขอ permission, register device และส่ง token ให้ callback

## `src/lib/roles.js`

- `getRoleLabel`: แปลง role code เป็นข้อความไทย
- `isRescuePersonnel`: ตรวจ profile ว่า active และอยู่ในกลุ่มเจ้าหน้าที่กู้ภัย

## `src/lib/supabaseClient.js`

- ตรวจ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`
- สร้าง Supabase client พร้อม persistent session, auto refresh และ PKCE

## `src/pages/AdminPage.jsx`

- `toDateTimeLocal`: แปลง ISO datetime เป็นค่า input `datetime-local`
- `normalizeNews`: เติม default และ normalize ข่าวสำหรับ editor
- `normalizeSlide`: เติม default และ normalize slide สำหรับ editor
- `AdminPage`: หน้าศูนย์จัดการระบบและ state หลัก
- `loadAll`: โหลด counts, news, slides และ settings แบบ parallel
- `saveContent`: validate แล้ว insert/update news หรือ slide
- `removeContent`: ยืนยันและลบ news/slide
- `saveSettings`: upsert app settings
- `Overview`: การ์ดสรุปจำนวนข้อมูลแต่ละตาราง
- `ContentList`: รายการ CRUD ที่ใช้ร่วมกันระหว่างข่าวและสไลด์
- `ContentEditor`: modal editor ข่าว/สไลด์
- `SettingsForm`: form ข้อมูลกลางของระบบ
- `Field`: wrapper label/input ของหน้า admin
- `update`: อัปเดต field ของข่าวหรือสไลด์ใน modal editor

## `src/pages/AmbulancesAdminPage.jsx`

- `getStatusLabel`: แปลงสถานะรถเป็นข้อความไทย
- `normalizeForm`: เติมค่า default ของ form รถ
- `AmbulancesAdminPage`: โหลด ค้นหา เพิ่ม แก้ไข ลบ และแสดงรถ
- `loadRows`: โหลดรถเรียงตาม `sort_order`
- `updateForm`: อัปเดต field ใน editor
- `save`: validate แล้ว insert/update รถ
- `remove`: ยืนยันและลบรถ
- `Field`: wrapper label/input

## `src/pages/AuthPage.jsx`

- `mapError`: แปลงข้อความ error ของ Supabase เป็นข้อความผู้ใช้
- `useDebouncedValue`: delay ค่าที่เปลี่ยนเร็ว เช่น username availability
- `normalizeUsername`: trim/lowercase และ normalize username
- `normalizeEmail`: trim/lowercase email
- `formatPhone`: normalize รูปแบบเบอร์โทร
- `passwordStrength`: ประเมินความแข็งแรงของรหัสผ่าน
- `FormInput`: input พร้อม label/icon/error
- `saveDeviceToken`: บันทึก native push token หลัง auth
- `AuthPage`: login/register UI และ state
- `checkUsernameAvailability`: เรียก RPC ตรวจ username ซ้ำ
- `markTouched`: mark field ว่าผู้ใช้แตะแล้ว
- `clearMessages`: ล้าง success/error message
- `handleLogin`: resolve username/email แล้ว sign in
- `handleRegister`: validate, sign up และบันทึก metadata

## `src/pages/CommandCenterPage.jsx`

- `getRescueStationLabel`: แปลงค่าพื้นที่เป็น label
- `parseGps`: parse GPS สำหรับหน้าศูนย์สั่งการ
- `formatShortDate`: จัดรูปแบบวันที่ไทยแบบสั้น
- `getCaseTypeLabel`: แปลงประเภทเคส
- `buildMapsLink`: สร้าง Google Maps URL
- `buildFallbackMessage`: สร้างข้อความเมื่อ parent ไม่ส่ง message มา
- `getStatusBadge`: เลือก class สีตามสถานะ
- `CommandCenterPage`: UI แจ้งเหตุ ส่ง LINE/Push และติดตามเคสล่าสุด
- `normalizeRescueStation`: normalize ค่า all/ทุกพื้นที่/ชื่อพื้นที่
- `setNow`: ตั้งวันที่เวลา draft เป็นปัจจุบัน
- `confirmSave`: ยืนยันก่อนสร้าง incident
- `confirmCancelCase`: ยืนยันก่อนยกเลิก incident
- `Field`: wrapper label
- `Input`: input มาตรฐานของหน้า
- `Textarea`: textarea มาตรฐานของหน้า

## `src/pages/DashboardPage.jsx`

- `getCaseTypeMeta`: คืน label/icon/style ของประเภทเคส
- `countPatientsByStatus`: นับผู้ป่วยตาม status
- `buildTambonRows`: aggregate จำนวนเคสตามตำบล
- `formatDateTime`: จัดวันที่และเวลาสำหรับรายการเคส
- `sortByNewest`: sort incidents ใหม่ไปเก่า
- `EmptyState`: UI เมื่อไม่มีข้อมูล
- `CountUpNumber`: animate ตัวเลขสถิติ
- `animate`: animation frame loop ภายใน CountUpNumber
- `SliderPanel`: slider ภาพหน้า dashboard รองรับข้อมูลจากฐานข้อมูลและภาพสำรอง
- `Stat3DCard`: การ์ดสถิติ
- `DashboardPage`: หน้าสถิติ ข่าวประชาสัมพันธ์ สไลด์ และรายการเคส
- `loadDashboardContent`: โหลดสไลด์ ข่าวที่เผยแพร่ และค่าตั้งระบบจาก Supabase โดย fallback เป็นสไลด์ใน `public/slides`


## `src/pages/IncidentDetailPanel.jsx`

- `normalizeIncidentType`: ทำให้ชนิดเคสจากข้อมูลหลายรูปแบบเป็นค่ามาตรฐาน
- `getIncidentDisplayDate`: เลือกและจัดรูปแบบวันที่ที่ใช้แสดงในรายละเอียดเคส
- `getIncidentDisplayTime`: เลือกและจัดรูปแบบเวลาที่ใช้แสดงในรายละเอียดเคส
- `IncidentDetailPanel`: แสดงรายละเอียดเคส ไทม์ไลน์ และแชท พร้อมปุ่มย้อนกลับ/รีเฟรช

## `src/pages/IncidentFormPage.jsx`

- `getNowParts`: คืนวันที่และเวลาปัจจุบัน
- `SummaryRow`: แถวข้อมูลสรุป
- `SummaryCard`: การ์ดสรุปก่อนบันทึก
- `MapProStyle`: CSS เฉพาะแผนที่
- `SummaryBottomSheet`: bottom sheet ยืนยันข้อมูล
- `IncidentFormPage`: UI ฟอร์มเคสทั้งหมด
- `setNow`: ตั้งวันที่/เวลาปัจจุบัน
- `refocusMapToPin`: เลื่อน map กลับ marker
- `handleLocateCurrentPosition`: ขอพิกัดปัจจุบันและ recenter
- `removeVehicleFully`: ยืนยันและลบรถ
- `removePatientFully`: ยืนยันและลบผู้ป่วย
- `openSummaryBeforeSubmit`: validate ขั้นต้นและเปิดสรุป
- `confirmSubmit`: ปิดสรุปแล้วเรียก submit จริง

## `src/pages/NotificationsPage.jsx`

- `formatNotificationTime`: จัดรูปแบบเวลาการแจ้งเตือน
- `getNotificationTarget`: อ่าน incident/deep-link target จาก payload
- `NotificationsPage`: กล่องแจ้งเตือนพร้อม realtime
- `refresh`: โหลด inbox และแจ้ง unread count กลับ parent
- `openItem`: mark read แล้วเปิด incident
- `markAllRead`: mark ทุก notification ว่าอ่านแล้ว

## `src/pages/PersonnelPage.jsx`

- `sortIndex`: คืนลำดับตามรายการกำหนด หรือ 999 เมื่อไม่พบ
- `getBranch`: เลือกชื่อหน่วยจาก schema ใหม่/เก่า
- `getGroup`: เลือกกลุ่มตำแหน่งจาก schema ใหม่/เก่า
- `getDisplayName`: เลือกชื่อที่เหมาะสมจากหลาย field
- `getCallsign`: เลือกนามเรียกขาน
- `getPhoto`: เลือก URL รูป
- `getSortOrder`: เลือกลำดับแสดงผล
- `getSocialLinks`: รวม social links จาก column และ JSON
- `normalizeExternalUrl`: เติม `https://` เมื่อ link ไม่มี scheme
- `groupPersonnel`: sort และจัดกลุ่มตามหน่วย/ตำแหน่ง
- `PersonnelPage`: ค้นหา กรอง และแสดงการ์ดบุคลากรจาก props
- `clearFilters`: รีเซ็ต keyword และตัวกรอง

## `src/pages/ReportPage.jsx`

- `ReportPage`: ค้นหา เลือกเคส สรุป และสั่งพิมพ์รายงาน
- `EmptyBox`: UI เมื่อไม่มีข้อมูล
- `SummaryCard`: การ์ดตัวเลขสรุป
- `DetailRow`: แถว label/value
- `labelCaseType`: แปลงประเภทเคสเป็นข้อความ
- `toggleSelection`: เลือก/ยกเลิกเคสเดียว
- `toggleSelectAll`: เลือก/ยกเลิกเคสทุกแถวที่กรองอยู่


## `src/pages/UsersAdminPage.jsx`

- `UsersAdminPage`: แสดงรายชื่อบัญชีและจัดการ role, สถานะบัญชี และพื้นที่รับผิดชอบ
- `renderControls`: สร้างชุด select/button จัดการผู้ใช้ที่ใช้ร่วมกันในมุมมอง desktop และ mobile

## `src/pwa.js`

- `registerKoksaiPWA`: ลงทะเบียน service worker เฉพาะ secure context และขอ update เมื่อหน้ากลับมา focus

## `public/firebase-messaging-sw.js`

Service worker มี event handlers สำหรับ:

- `install`: cache app shell และ `skipWaiting`
- `activate`: ลบ cache รุ่นเก่าและ claim clients
- `fetch`: network-first สำหรับ navigation และ cache-first-with-refresh สำหรับ static assets
- `messaging.onBackgroundMessage`: แสดง background notification แบบ data-only
- `notificationclick`: ตรวจ URL ให้อยู่ origin เดียวกัน แล้ว focus/navigate/open app

## `supabase/functions/line-alert/index.ts`

- `jsonResponse`: สร้าง Response JSON พร้อม CORS headers
- request handler: ตรวจ method, JWT/profile/role, LINE secrets, sanitize message แล้ว push ไป LINE group

## `supabase/functions/send-alert/index.ts`

- `normalizeNotificationPath`: จำกัด notification URL ให้เป็น path ภายในแอป
- `jsonResponse`: สร้าง Response JSON พร้อม CORS headers
- `base64Url`: encode byte/string สำหรับ JWT แบบ URL-safe
- `pemToArrayBuffer`: แปลง private key PEM เป็น ArrayBuffer
- `getFirebaseAccessToken`: สร้าง service-account JWT และแลก OAuth access token
- `getAppUrl`: อ่านและ normalize base URL ของแอป
- `toAbsoluteAppUrl`: สร้าง absolute URL ที่ปลอดภัยจาก path
- `sendOneFcmMessage`: ส่ง FCM HTTP v1 หนึ่ง token
- `eligibleProfiles`: กรองผู้รับตาม active role และ station
- request handler: ตรวจผู้ส่ง, สร้าง notification + recipients, โหลด device tokens และส่ง FCM
