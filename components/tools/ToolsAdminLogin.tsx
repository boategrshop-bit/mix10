"use client";

import { useState } from "react";

export default function ToolsAdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm space-y-3 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-6 shadow-[0_8px_30px_rgba(28,26,23,0.05)]"
    >
      <label className="text-sm font-medium text-[#4A4239]" htmlFor="tools-admin-password">
        รหัสผ่านแอดมิน
      </label>
      <input
        id="tools-admin-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded-lg border border-[#E0D9C9] bg-white px-3 py-2.5 text-sm text-[#26221D] outline-none transition placeholder:text-[#B3A992] focus:border-[#1C1A17] focus:ring-2 focus:ring-[#1C1A17]/10"
        autoFocus
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded-xl bg-[#1C1A17] px-4 py-3 text-sm font-bold text-[#F7F3EA] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
