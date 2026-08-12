/*
 IncidentChat_case_format_fixed.jsx
 ปรับ:
 - หัวห้องแชทแสดงเลขเคส
 - รองรับข้อความ Timeline หลายบรรทัด
 - รูปแบบข้อความ:
 ชื่อเจ้าหน้าที่
 ว.25 ที่เกิดเหตุ
 เวลา 19:25 น.
*/
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

const CHAT_BUCKET = "incident-chat";

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function signChatImage(path) {
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data?.signedUrl || "";
}

async function hydrateMessage(message) {
  if (!message?.image_path) return message;
  try {
    return { ...message, image_url: await signChatImage(message.image_path) };
  } catch {
    return { ...message, image_url: "" };
  }
}

export default function IncidentChat({ incidentId, incident, currentUser, profile }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef(null);
  const endRef = useRef(null);

  const displayName = useMemo(
    () => profile?.full_name || profile?.username || currentUser?.email || "เจ้าหน้าที่",
    [currentUser?.email, profile?.full_name, profile?.username],
  );

  useEffect(() => {
    let active = true;

    async function loadMessages() {
      if (!incidentId) {
        if (active) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { data, error: loadError } = await supabase
          .from("case_messages")
          .select("id, incident_id, sender_id, sender_name, message_text, image_path, created_at")
          .eq("incident_id", incidentId)
          .order("created_at", { ascending: true });
        if (loadError) throw loadError;
        const hydrated = await Promise.all((data || []).map(hydrateMessage));
        if (active) setMessages(hydrated);
      } catch (err) {
        if (active) setError(err?.message || "โหลดห้องแชทไม่สำเร็จ");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMessages();

    if (!incidentId) {
      return () => {
        active = false;
      };
    }

    const channel = supabase
      .channel(`case-chat-${incidentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "case_messages",
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          const hydrated = await hydrateMessage(payload.new);
          if (!active) return;
          setMessages((prev) =>
            prev.some((item) => item.id === hydrated.id) ? prev : [...prev, hydrated],
          );
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!isExpanded) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsExpanded(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    if (sending || (!text.trim() && !image) || !incidentId || !currentUser?.id) return;

    setSending(true);
    setError("");
    let imagePath = null;
    try {
      if (image) {
        if (!image.type.startsWith("image/")) throw new Error("รองรับเฉพาะไฟล์รูปภาพ");
        if (image.size > 8 * 1024 * 1024) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 8 MB");
        const rawExtension = image.name.split(".").pop() || "jpg";
        const extension = rawExtension.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const uniqueId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
        imagePath = `${incidentId}/${currentUser.id}/${Date.now()}-${uniqueId}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from(CHAT_BUCKET)
          .upload(imagePath, image, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase.from("case_messages").insert({
        incident_id: incidentId,
        sender_id: currentUser.id,
        sender_name: displayName,
        message_text: text.trim() || null,
        image_path: imagePath,
      });
      if (insertError) throw insertError;

      setText("");
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      if (imagePath) {
        await supabase.storage.from(CHAT_BUCKET).remove([imagePath]).catch(() => {});
      }
      setError(err?.message || "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      className={`flex flex-col overflow-hidden border border-[#ead9b3] bg-[#fffaf0] shadow-[0_14px_32px_rgba(127,19,36,0.10)] ${
        isExpanded
          ? "fixed inset-0 z-[100] h-[100dvh] rounded-none"
          : "mt-5 rounded-[26px]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#ead9b3] bg-gradient-to-r from-[#7f1324] to-[#a51d2f] px-4 py-3 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <MessageCircle className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="font-black">ห้องแชทประจำเคส {incident?.case_id ? `#${incident.case_id}` : ""}</div>
            <div className="truncate text-xs text-white/75">
              ข้อความและรูปภาพจะผูกกับเคสนี้เท่านั้น
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
          aria-label={isExpanded ? "ย่อหน้าต่างแชท" : "ขยายหน้าต่างแชทเต็มจอ"}
          title={isExpanded ? "ย่อหน้าต่างแชท" : "ขยายเต็มจอ"}
        >
          {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={`min-h-[220px] space-y-3 overflow-y-auto bg-white/80 p-4 ${
          isExpanded ? "min-h-0 flex-1" : "max-h-[420px]"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm font-bold text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> กำลังโหลดข้อความ
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">ยังไม่มีข้อความในเคสนี้</div>
        ) : (
          messages.map((message) => {
            const own = message.sender_id === currentUser?.id;
            return (
              <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    own
                      ? "rounded-br-md bg-[#7f1324] text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div className={`text-[11px] font-black ${own ? "text-[#f7dca2]" : "text-[#7f1324]"}`}>
                    {message.sender_name || "เจ้าหน้าที่"}
                  </div>
                  {message.message_text ? (
                    <div className="mt-1 whitespace-pre-line break-words text-sm leading-6">
                      {message.message_text}
                    </div>
                  ) : null}
                  {message.image_url ? (
                    <button
                      type="button"
                      onClick={() => window.open(message.image_url, "_blank", "noopener,noreferrer")}
                      className="mt-2 block overflow-hidden rounded-xl border border-white/20"
                    >
                      <img src={message.image_url} alt="ภาพในห้องแชท" className="max-h-64 w-full object-cover" />
                    </button>
                  ) : null}
                  <div className={`mt-1 text-[10px] ${own ? "text-white/65" : "text-slate-400"}`}>
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={sendMessage} className="shrink-0 border-t border-[#ead9b3] bg-[#fffaf0] p-3">
        {image ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-[#e1c57f] bg-white px-3 py-2 text-xs text-slate-700">
            <span className="truncate">รูปภาพ: {image.name}</span>
            <button type="button" onClick={() => setImage(null)} className="rounded-lg p-1 hover:bg-slate-100" aria-label="ยกเลิกรูปภาพ">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {error ? <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</div> : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            aria-label="เลือกรูปภาพสำหรับส่งในแชท"
            className="hidden"
            onChange={(event) => setImage(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d4a84f] bg-white text-[#7f1324] shadow-sm"
            aria-label="แนบรูปภาพ"
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="พิมพ์ข้อความเกี่ยวกับเคส..."
            className="min-h-11 flex-1 resize-none rounded-2xl border border-[#d4a84f] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7f1324]/20"
          />
          <button
            type="submit"
            disabled={sending || (!text.trim() && !image)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7f1324] text-white shadow-md disabled:opacity-50"
            aria-label="ส่งข้อความ"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </section>
  );
}
