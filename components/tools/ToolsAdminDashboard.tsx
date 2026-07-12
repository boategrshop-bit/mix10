"use client";

import { useEffect, useState } from "react";

interface Order {
  id: number;
  customerEmail: string;
  productName: string;
  amountThb: number;
  status: "pending" | "paid";
  createdAt: string;
  paidAt: string | null;
  emailSentAt: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

export default function ToolsAdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        fetch("/api/tools/orders"),
        fetch("/api/tools/settings"),
      ]);
      const data = await ordersRes.json();
      if (!ordersRes.ok) throw new Error(data?.error?.message ?? "โหลดข้อมูลไม่สำเร็จ");
      setOrders(data.orders ?? []);
      const settings = await settingsRes.json();
      if (settingsRes.ok) setAutoApprove(Boolean(settings.autoApprove));
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAutoApprove() {
    if (autoApprove === null) return;
    const next = !autoApprove;
    setToggleBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/tools/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoApprove: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "อัปเดตไม่สำเร็จ");
      setAutoApprove(next);
      setNotice(next ? "เปิดอนุมัติอัตโนมัติแล้ว — ลูกค้าจะได้ลิงก์ทันทีหลังกดชำระเงิน" : "ปิดอนุมัติอัตโนมัติแล้ว — ออเดอร์ใหม่จะรอให้แอดมินกดอนุมัติก่อน");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "อัปเดตไม่สำเร็จ");
    } finally {
      setToggleBusy(false);
    }
  }

  async function act(id: number, action: "mark-paid" | "resend") {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/tools/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "ดำเนินการไม่สำเร็จ");
      setNotice(
        action === "mark-paid"
          ? `ออเดอร์ #${id} ทำเครื่องหมายชำระแล้ว` + (data.emailSent ? " · ส่งอีเมลแล้ว" : "")
          : `ส่งอีเมลออเดอร์ #${id} ` + (data.emailSent ? "สำเร็จ" : "ไม่สำเร็จ")
      );
      await load();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  const paidCount = orders.filter((o) => o.status === "paid").length;
  const revenue = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.amountThb, 0);

  const btnGhost =
    "rounded-lg border border-[#DED6C6] bg-white px-3 py-1.5 text-xs font-semibold text-[#6B6252] transition hover:border-[#1C1A17] hover:text-[#1C1A17] disabled:opacity-40";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm text-[#6B6252]">
          <span>ทั้งหมด {orders.length}</span>
          <span>ชำระแล้ว {paidCount}</span>
          <span>ยอดรวม {revenue.toLocaleString()} บาท</span>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={btnGhost}>รีเฟรช</button>
          <button onClick={handleLogout} className={btnGhost}>ออกจากระบบ</button>
        </div>
      </div>

      {/* Auto-approve toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] px-5 py-4">
        <div>
          <p className="text-sm font-bold text-[#1C1A17]">อนุมัติอัตโนมัติ (Auto-approve)</p>
          <p className="mt-0.5 text-xs text-[#8A8072]">
            {autoApprove === null
              ? "กำลังโหลด..."
              : autoApprove
                ? "เปิด — ลูกค้าได้ลิงก์ทันทีหลังกดชำระเงิน"
                : "ปิด — ออเดอร์ใหม่รอแอดมินกดอนุมัติก่อนส่งลิงก์"}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={autoApprove === true}
          disabled={autoApprove === null || toggleBusy}
          onClick={toggleAutoApprove}
          className={`relative h-7 w-12 flex-shrink-0 rounded-full transition disabled:opacity-50 ${
            autoApprove ? "bg-[#1C1A17]" : "bg-[#DED6C6]"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
              autoApprove ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      {notice && (
        <p className="rounded-lg border border-[#E9E3D6] bg-[#FFFDF8] px-3 py-2 text-xs text-[#4A4239]">{notice}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#9A9081]">กำลังโหลด...</p>
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-8 text-center text-sm text-[#9A9081]">
          ยังไม่มีคำสั่งซื้อ
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E9E3D6]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#F4EFE4] text-xs uppercase text-[#9A9081]">
              <tr>
                <th className="px-4 py-3 font-semibold">#</th>
                <th className="px-4 py-3 font-semibold">สินค้า</th>
                <th className="px-4 py-3 font-semibold">ลูกค้า</th>
                <th className="px-4 py-3 font-semibold">ยอด</th>
                <th className="px-4 py-3 font-semibold">สถานะ</th>
                <th className="px-4 py-3 font-semibold">อีเมล</th>
                <th className="px-4 py-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE9DD] bg-[#FFFDF8]">
              {orders.map((o) => (
                <tr key={o.id} className="text-[#4A4239]">
                  <td className="px-4 py-3 font-semibold text-[#1C1A17]">{o.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#1C1A17]">{o.productName}</div>
                    <div className="text-xs text-[#9A9081]">{formatDate(o.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">{o.customerEmail}</td>
                  <td className="px-4 py-3 font-semibold">{o.amountThb.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {o.status === "paid" ? (
                      <span className="rounded-full bg-[#E4EFE0] px-2 py-0.5 text-xs font-semibold text-[#4A7A3A]">
                        ชำระแล้ว
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#F1EBDD] px-2 py-0.5 text-xs font-semibold text-[#8A8072]">
                        รอชำระ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#9A9081]">{o.emailSentAt ? "ส่งแล้ว" : "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {o.status !== "paid" && (
                        <button onClick={() => act(o.id, "mark-paid")} disabled={busyId === o.id} className={btnGhost}>
                          ทำเครื่องหมายชำระ
                        </button>
                      )}
                      <button onClick={() => act(o.id, "resend")} disabled={busyId === o.id} className={btnGhost}>
                        ส่งเมลซ้ำ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
