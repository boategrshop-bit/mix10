"use client";

import { useEffect, useState, type ReactNode } from "react";

interface LicenseKeyGateProps {
  children: ReactNode;
}

export default function LicenseKeyGate({ children }: LicenseKeyGateProps) {
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/check-key")
      .then((r) => r.json())
      .then((data) => setStatus(data?.valid ? "valid" : "invalid"))
      .catch(() => setStatus("invalid"));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/redeem-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "คีย์ไม่ถูกต้อง");
      }
      setStatus("valid");
    } catch (err) {
      setError(err instanceof Error ? err.message : "คีย์ไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  }

  if (status === "checking") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 px-4 py-10 sm:px-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4382BB] border-t-transparent" />
      </main>
    );
  }

  if (status === "valid") {
    return <>{children}</>;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 py-10 sm:px-6">
      <div className="space-y-2 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="MIX10" className="mx-auto w-full max-w-xs" />
        <h1 className="text-xl font-bold text-gray-100">กรอกคีย์เพื่อใช้งาน</h1>
        <p className="text-sm text-gray-400">กรุณากรอกคีย์สมาชิกที่ได้รับเพื่อเริ่มใช้งาน MIX10</p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm"
      >
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="MIX10-XXXX-XXXX"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center font-mono text-sm uppercase text-gray-100 shadow-sm outline-none transition placeholder:text-gray-600 focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
          autoFocus
        />
        {error && <p className="text-center text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !key.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "กำลังตรวจสอบ..." : "ยืนยันคีย์"}
        </button>
      </form>
    </main>
  );
}
