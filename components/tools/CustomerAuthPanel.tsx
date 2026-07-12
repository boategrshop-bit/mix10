"use client";

import { useState } from "react";

type Mode = "login" | "register";

const inputClass =
  "w-full rounded-lg border border-[#E0D9C9] bg-white px-3 py-2.5 text-sm text-[#26221D] outline-none transition placeholder:text-[#B3A992] focus:border-[#1C1A17] focus:ring-2 focus:ring-[#1C1A17]/10";

const primaryBtn =
  "w-full rounded-xl bg-[#1C1A17] px-4 py-3 text-sm font-bold text-[#F7F3EA] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export default function CustomerAuthPanel() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const endpoint = mode === "register" ? "/api/tools/register" : "/api/tools/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "ดำเนินการไม่สำเร็จ");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-6 shadow-[0_8px_30px_rgba(28,26,23,0.05)]">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1EBDD] p-1">
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "login" ? "bg-white text-[#1C1A17] shadow-sm" : "text-[#8A8072]"
          }`}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); setError(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "register" ? "bg-white text-[#1C1A17] shadow-sm" : "text-[#8A8072]"
          }`}
        >
          สมัครใหม่
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#4A4239]" htmlFor="account-email">อีเมล</label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@email.com"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#4A4239]" htmlFor="account-password">รหัสผ่าน</label>
          <input
            id="account-password"
            type="password"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            required
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button type="submit" disabled={loading || !email || !password} className={primaryBtn}>
          {loading ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : "สมัครใหม่"}
        </button>
      </form>
    </div>
  );
}
