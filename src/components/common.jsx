import React, { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// Keep marker assets inside the application bundle. The previous CDN marker
// URLs disappeared when the device was offline or the CDN was blocked.
const rescueMarkerIcon = new L.Icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-[#e4ca83]/30 bg-white/10 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2 text-white/80">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <div className="text-[10px] font-semibold">{label}</div>
      </div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}

export function SectionShell({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[20px] border border-[#d9c080] bg-white p-4 shadow-[0_10px_24px_rgba(70,28,12,0.07)] sm:rounded-[22px] sm:p-5">
      <div className="mb-4 flex items-center gap-2 border-b border-[#eadcb4] pb-3 text-slate-900">
        {Icon ? <Icon className="h-5 w-5 text-[#7f1324]" aria-hidden="true" /> : null}
        <h2 className="text-[15px] font-black sm:text-base">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  readOnly = false,
  disabled = false,
  list,
}) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        list={list}
        onChange={(e) => onChange?.(e.target.value)}
        className="rescue-field h-11 w-full rounded-xl border border-[#cdb575] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#8a1224] focus:ring-4 focus:ring-[#8a1224]/10 disabled:bg-slate-100 disabled:text-slate-500"
      />
    </label>
  );
}

export function Select({ label, value, onChange, options = [], disabled = false }) {
  return (
    <label className="block min-w-0">
      <div className="mb-2 text-sm font-semibold text-slate-700">{label}</div>
      <select
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="rescue-field h-11 w-full rounded-xl border border-[#cdb575] bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-[#8a1224] focus:ring-4 focus:ring-[#8a1224]/10 disabled:bg-slate-100 disabled:text-slate-500"
      >
        <option value="">เลือก</option>
        {options.map((opt) => {
          const option = typeof opt === "object" && opt !== null
            ? { value: opt.value ?? "", label: opt.label ?? opt.value ?? "" }
            : { value: String(opt), label: String(opt) };
          return (
            <option key={String(option.value)} value={String(option.value)}>
              {String(option.label)}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function PickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      onPick?.({ lat, lng, latlng: e.latlng });
    },
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  const lat = Number(center?.[0]);
  const lng = Number(center?.[1]);

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.setView([lat, lng], map.getZoom(), { animate: false });
  }, [lat, lng, map]);

  return null;
}

export function MapPicker({ position, onPick, mapLabel, incidents = [] }) {
  const lat = Number(position?.lat);
  const lng = Number(position?.lng);
  const hasPosition = Number.isFinite(lat) && Number.isFinite(lng);
  const center = hasPosition ? [lat, lng] : [16.779889, 101.242778];

  return (
    <MapContainer
      center={center}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full min-h-[260px] w-full rounded-xl border border-[#cdb575]"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <RecenterMap center={center} />
      <PickHandler onPick={onPick} />

      {hasPosition ? (
        <Marker position={[lat, lng]} icon={rescueMarkerIcon}>
          <Popup>{mapLabel || "จุดที่เลือก"}</Popup>
        </Marker>
      ) : null}

      {incidents
        .filter((item) => Number.isFinite(Number(item.gps_lat)) && Number.isFinite(Number(item.gps_lng)))
        .slice(0, 100)
        .map((item) => (
          <Marker
            key={item.id}
            position={[Number(item.gps_lat), Number(item.gps_lng)]}
            icon={rescueMarkerIcon}
          />
        ))}

      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control max-w-[min(70vw,280px)] rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow">
          {mapLabel || "แตะเพื่อเลือกตำแหน่ง"}
        </div>
      </div>
    </MapContainer>
  );
}
