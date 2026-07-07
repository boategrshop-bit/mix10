"use client";

import { useEffect, useState } from "react";

interface LicenseKeyRow {
  id: number;
  code: string;
  durationDays: number;
  createdAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  revoked: boolean;
}

const DURATION_OPTIONS = [3, 7, 30];

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH");
}

function statusOf(key: LicenseKeyRow): { label: string; className: string } {
  if (key.revoked) return { label: "ถูกระงับ", className: "bg-red-500/10 text-red-400" };
  if (!key.activatedAt) return { label: "ยังไม่ใช้งาน", className: "bg-white/5 text-gray-400" };
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    return { label: "หมดอายุ", className: "bg-amber-500/10 text-amber-400" };
  }
  return { label: "ใช้งานอยู่", className: "bg-emerald-500/10 text-emerald-400" };
}

export default function AdminKeysDashboard() {
  const [keys, setKeys] = useState<LicenseKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [durationDays, setDurationDays] = useState(7);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/keys");
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "โหลดรายการคีย์ไม่สำเร็จ");
      setKeys(data.keys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดรายการคีย์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: intentional, matches React's documented data-fetching effect pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "สร้างคีย์ไม่สำเร็จ");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างคีย์ไม่สำเร็จ");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      const response = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "ระงับคีย์ไม่สำเร็จ");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ระงับคีย์ไม่สำเร็จ");
    }
  }

  async function handleCopy(id: number, code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard permission denied; user can still select-and-copy manually
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-300" htmlFor="durationDays">
              สร้างคีย์ใหม่ (จำนวนวัน)
            </label>
            <select
              id="durationDays"
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-gray-100 shadow-sm outline-none focus:border-[#4382BB] focus:ring-2 focus:ring-[#4382BB]/30"
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d} className="bg-[#0d121c]">
                  {d} วัน
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-xl bg-gradient-to-r from-[#5a9bd4] to-[#4382BB] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-lg hover:shadow-[#4382BB]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creating ? "กำลังสร้าง..." : "สร้างคีย์"}
          </button>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-gray-500 underline underline-offset-2 hover:text-red-400"
        >
          ออกจากระบบ
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-100">รายการคีย์ทั้งหมด ({keys.length})</p>
          <button
            type="button"
            onClick={loadKeys}
            className="text-xs font-medium text-[#7bafdb] underline underline-offset-2 hover:text-[#a3c8e6]"
          >
            รีเฟรช
          </button>
        </div>

        {loading ? (
          <div className="flex h-16 animate-pulse items-center justify-center rounded-xl bg-[#4382BB]/10 text-xs text-[#7bafdb]">
            กำลังโหลด...
          </div>
        ) : keys.length === 0 ? (
          <p className="text-xs text-gray-500">ยังไม่มีคีย์ในระบบ</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => {
              const status = statusOf(key);
              return (
                <div
                  key={key.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-100">{key.code}</span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${status.className}`}>{status.label}</span>
                      <span className="text-gray-500">{key.durationDays} วัน</span>
                    </div>
                    <p className="text-gray-500">
                      สร้าง: {formatDate(key.createdAt)} · เริ่มใช้: {formatDate(key.activatedAt)} · หมดอายุ:{" "}
                      {formatDate(key.expiresAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(key.id, key.code)}
                      className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-medium text-gray-300 transition hover:bg-white/5"
                    >
                      {copiedId === key.id ? "คัดลอกแล้ว!" : "คัดลอก"}
                    </button>
                    {!key.revoked && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(key.id)}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 font-medium text-gray-300 transition hover:bg-red-500/10 hover:text-red-400"
                      >
                        ระงับ
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
