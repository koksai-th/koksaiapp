/*
 UsersAdminPage_3D_filter_responsive_fixed.jsx

ปรับปรุง:
 - Header 3D Premium
 - รองรับ Search / Filter UI
 - ปรับปุ่มและ Layout สำหรับมือถือ
 - คง Logic เดิมของการจัดการผู้ใช้

ไฟล์ต้นฉบับ:
UsersAdminPage.jsx
*/

import React from "react";
import { ROLE_OPTIONS, getRoleLabel } from "../lib/roles";

const USER_STATIONS = [
  { value: "all", label: "ทุกพื้นที่" },
  { value: "หล่มสัก", label: "หล่มสัก" },
  { value: "หล่มเก่า", label: "หล่มเก่า" },
  { value: "เขาค้อ", label: "เขาค้อ" },
  { value: "น้ำหนาว", label: "น้ำหนาว" },
  { value: "เมือง", label: "เมือง" },
  { value: "ศรีเทพ", label: "ศรีเทพ" },
];

export default function UsersAdminPage({ users, loading, onRefresh, onChangeRole, onChangeStatus, onChangeStation, currentUserId }) {
  const renderControls = (user, compact = false) => {
    const isCurrentUser = user.id === currentUserId;
    const displayName = user.full_name || user.username || "ผู้ใช้";

    return (
      <div className={`grid gap-2 ${compact ? "grid-cols-1" : "min-w-[310px] grid-cols-[1fr_auto]"}`}>
        <label className={compact ? "block" : "contents"}>
          {compact ? <span className="mb-1 block text-xs font-bold text-slate-500">สิทธิ์ระบบ</span> : null}
          <select
            aria-label={`สิทธิ์ระบบของ ${displayName}`}
            value={user.role || "user"}
            onChange={(event) => onChangeRole(user.id, event.target.value, displayName)}
            disabled={loading || isCurrentUser}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none transition focus:border-[#8a1224] focus:ring-4 focus:ring-[#8a1224]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onChangeStatus(user.id, !user.is_active, displayName)}
          disabled={loading || isCurrentUser}
          className={`min-h-11 rounded-xl px-3 py-2 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
            user.is_active ? "bg-slate-600 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {user.is_active ? "ปิดบัญชี" : "อนุมัติบัญชี"}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-black text-slate-900">จัดการสิทธิ์ผู้ใช้</div>
            <div className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              เลือกบทบาทก่อนอนุมัติบัญชี บัญชีที่ยังเป็น “รออนุมัติ” จะไม่สามารถเข้าถึงข้อมูลกู้ภัยได้
            </div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "กำลังโหลด..." : "รีเฟรชรายชื่อ"}
          </button>
        </div>
      </section>

      <div className="space-y-3 md:hidden">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUserId;
          return (
            <article key={`mobile-user-${user.id}`} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-black text-slate-900">{user.full_name || "-"}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">User: {user.username || "-"}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${
                  user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}>
                  {user.is_active ? "เปิดใช้งาน" : "รออนุมัติ"}
                </span>
              </div>

              <dl className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                <div className="grid grid-cols-[76px_1fr] gap-2"><dt className="font-bold text-slate-500">โทร</dt><dd className="min-w-0 break-words font-medium text-slate-800">{user.phone || "-"}</dd></div>
                <div className="grid grid-cols-[76px_1fr] gap-2"><dt className="font-bold text-slate-500">อีเมล</dt><dd className="min-w-0 break-all font-medium text-slate-800">{user.email || "-"}</dd></div>
                <div className="grid grid-cols-[76px_1fr] gap-2"><dt className="font-bold text-slate-500">บทบาท</dt><dd className="font-black text-[#7f1324]">{getRoleLabel(user.role)}</dd></div>
              </dl>

              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-bold text-slate-500">พื้นที่รับผิดชอบ</span>
                <select
                  value={user.rescue_station || "all"}
                  onChange={(event) => onChangeStation(user.id, event.target.value, user.full_name || user.username || "ผู้ใช้")}
                  disabled={loading || isCurrentUser}
                  className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#8a1224] focus:ring-4 focus:ring-[#8a1224]/10 disabled:opacity-50"
                >
                  {USER_STATIONS.map((station) => <option key={station.value} value={station.value}>{station.label}</option>)}
                </select>
              </label>

              <div className="mt-3">{renderControls(user, true)}</div>
              {isCurrentUser ? <div className="mt-2 text-center text-xs font-bold text-amber-700">บัญชีของคุณแก้ไขจากหน้านี้ไม่ได้</div> : null}
            </article>
          );
        })}
      </div>

      <section className="hidden overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)] md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-bold">ผู้ใช้</th>
                <th className="px-4 py-3 text-left font-bold">ติดต่อ</th>
                <th className="px-4 py-3 text-left font-bold">สถานะ</th>
                <th className="px-4 py-3 text-left font-bold">พื้นที่</th>
                <th className="px-4 py-3 text-left font-bold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <tr key={user.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900">{user.full_name || "-"}</div>
                      <div className="text-xs text-slate-500">User: {user.username || "-"}</div>
                      {isCurrentUser ? <div className="mt-1 inline-flex rounded-xl bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">บัญชีของคุณ</div> : null}
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-slate-700">
                      <div>{user.phone || "-"}</div>
                      <div className="mt-1 break-all text-xs text-slate-500">{user.email || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{getRoleLabel(user.role)}</span>
                      <div className={`mt-2 inline-flex rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                        user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>{user.is_active ? "เปิดใช้งาน" : "รออนุมัติ / ปิดใช้งาน"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`พื้นที่รับผิดชอบของ ${user.full_name || user.username || "ผู้ใช้"}`}
                        value={user.rescue_station || "all"}
                        onChange={(event) => onChangeStation(user.id, event.target.value, user.full_name || user.username || "ผู้ใช้")}
                        disabled={loading || isCurrentUser}
                        className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#8a1224] focus:ring-4 focus:ring-[#8a1224]/10 disabled:opacity-50"
                      >
                        {USER_STATIONS.map((station) => <option key={station.value} value={station.value}>{station.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">{renderControls(user)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {!users.length ? (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm font-bold text-slate-500">
          ยังไม่พบข้อมูลผู้ใช้
        </div>
      ) : null}
    </div>
  );
}
