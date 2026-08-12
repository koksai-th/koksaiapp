import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled application error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#7f1324_0%,#3b0710_58%,#210309_100%)] px-4 py-10 text-white">
        <section className="w-full max-w-lg rounded-[28px] border border-[#e1c578]/40 bg-white/10 p-6 text-center shadow-2xl backdrop-blur">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-200">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-black">ระบบพบข้อผิดพลาดที่ไม่คาดคิด</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            โปรดลองโหลดหน้าใหม่ หากยังเกิดซ้ำให้ส่งข้อความด้านล่างให้ผู้ดูแลระบบ
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-2xl bg-black/30 p-3 text-left text-xs text-rose-100">
            {error?.message || String(error)}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#e1c578] bg-[#fff4cf] px-5 py-2.5 text-sm font-black text-[#68101d] transition hover:bg-white"
          >
            <RefreshCcw className="h-4 w-4" /> โหลดหน้าใหม่
          </button>
        </section>
      </main>
    );
  }
}
