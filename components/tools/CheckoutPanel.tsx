"use client";

import { useState } from "react";
import { PAYMENT } from "@/lib/tools-content";

interface CheckoutProduct {
  id: string;
  name: string;
  priceThb: number;
  fileLabel: string;
}

type Mode = "register" | "login";
type Step = "auth" | "start" | "pay" | "done" | "pending";

const inputClass =
  "w-full rounded-lg border border-[#E0D9C9] bg-white px-3 py-2.5 text-sm text-[#26221D] outline-none transition placeholder:text-[#B3A992] focus:border-[#1C1A17] focus:ring-2 focus:ring-[#1C1A17]/10";

const primaryBtn =
  "w-full rounded-xl bg-[#1C1A17] px-4 py-3 text-sm font-bold text-[#F7F3EA] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

export default function CheckoutPanel({
  product,
  initialEmail,
}: {
  product: CheckoutProduct;
  initialEmail: string | null;
}) {
  const [mode, setMode] = useState<Mode>("register");
  const [step, setStep] = useState<Step>(initialEmail ? "start" : "auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [downloadPath, setDownloadPath] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [qrOk, setQrOk] = useState(true);

  async function createOrder(): Promise<boolean> {
    const res = await fetch("/api/tools/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message ?? "สร้างคำสั่งซื้อไม่สำเร็จ");
    setOrderId(data.order.id);
    return true;
  }

  async function handleAuth(e: React.FormEvent) {
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
      await createOrder();
      setStep("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      await createOrder();
      setStep("pay");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ดำเนินการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function handlePaid() {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "ยืนยันไม่สำเร็จ");
      if (data.approved === false) {
        setStep("pending");
        return;
      }
      setDownloadPath(data.downloadPath);
      setEmailSent(Boolean(data.emailSent));
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ยืนยันไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  const card = "space-y-4 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-6 shadow-[0_8px_30px_rgba(28,26,23,0.05)]";

  // ---- Awaiting admin approval ----
  if (step === "pending") {
    return (
      <div className={card}>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F1EBDD] text-xl">
            ⏳
          </div>
          <h3 className="mt-3 text-lg font-bold text-[#1C1A17]">ได้รับข้อมูลการชำระเงินแล้ว</h3>
          <p className="mt-1 text-sm leading-relaxed text-[#6B6252]">
            แอดมินกำลังตรวจสอบ เมื่ออนุมัติแล้วระบบจะส่งลิงก์เข้าใช้งานไปที่อีเมลของคุณทันที
          </p>
        </div>
        <a href="/account" className="block text-center text-sm text-[#8A8072] underline">
          ดูสถานะคำสั่งซื้อในบัญชี
        </a>
      </div>
    );
  }

  // ---- Success ----
  if (step === "done") {
    return (
      <div className={card}>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1C1A17] text-xl text-[#F7F3EA]">
            ✓
          </div>
          <h3 className="mt-3 text-lg font-bold text-[#1C1A17]">ชำระเงินสำเร็จ</h3>
          <p className="mt-1 text-sm text-[#6B6252]">
            {emailSent
              ? "เราได้ส่งลิงก์ดาวน์โหลดไปที่อีเมลของคุณแล้ว"
              : "คำสั่งซื้อเสร็จสมบูรณ์ ดาวน์โหลดได้จากปุ่มด้านล่าง"}
          </p>
        </div>
        {downloadPath && (
          <a href={downloadPath} className={primaryBtn + " block text-center"}>
            ดาวน์โหลดไฟล์
          </a>
        )}
        <a href="/account" className="block text-center text-sm text-[#8A8072] underline">
          ดูคำสั่งซื้อทั้งหมดในบัญชี
        </a>
      </div>
    );
  }

  // ---- Payment ----
  if (step === "pay") {
    return (
      <div className={card}>
        <div>
          <h3 className="text-lg font-bold text-[#1C1A17]">ชำระเงิน</h3>
          <p className="mt-1 text-sm text-[#6B6252]">โอนเงินตามยอดด้านล่าง แล้วกดยืนยันเพื่อรับลิงก์ดาวน์โหลด</p>
        </div>

        <div className="rounded-xl border border-[#E9E3D6] bg-white p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-[#9A9081]">ยอดชำระ</p>
          <p className="mt-1 text-3xl font-bold text-[#1C1A17]">
            {product.priceThb.toLocaleString()} <span className="text-lg font-medium">บาท</span>
          </p>

          {qrOk && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={PAYMENT.qrSrc}
              alt="QR พร้อมเพย์"
              onError={() => setQrOk(false)}
              className="mx-auto mt-4 w-full max-w-[220px] rounded-lg border border-[#EFE9DD] bg-white p-2"
            />
          )}

          <div className="mt-4 space-y-0.5 text-sm">
            <p className="text-[#8A8072]">{PAYMENT.bank}</p>
            <p className="text-lg font-bold tracking-wide text-[#1C1A17]">{PAYMENT.accountNo}</p>
            <p className="text-[#6B6252]">{PAYMENT.accountName}</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#9A9081]">
          สแกน QR หรือโอนเข้าบัญชีด้านบน จากนั้นกดปุ่มด้านล่าง ระบบจะส่งลิงก์ดาวน์โหลดเข้าอีเมลทันที
          (ทีมงานจะตรวจสอบยอดอีกครั้งภายหลัง)
        </p>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={handlePaid} disabled={loading} className={primaryBtn}>
          {loading ? "กำลังยืนยัน..." : "ชำระเงินแล้ว รับลิงก์ดาวน์โหลด"}
        </button>
      </div>
    );
  }

  // ---- Logged-in start ----
  if (step === "start") {
    return (
      <div className={card}>
        <div>
          <h3 className="text-lg font-bold text-[#1C1A17]">สั่งซื้อ {product.name}</h3>
          <p className="mt-1 text-sm text-[#6B6252]">
            สั่งซื้อในนาม <span className="font-semibold text-[#1C1A17]">{initialEmail}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#E9E3D6] bg-white p-4 text-center">
          <p className="text-3xl font-bold text-[#1C1A17]">
            {product.priceThb.toLocaleString()} <span className="text-lg font-medium">บาท</span>
          </p>
          <p className="mt-1 text-sm text-[#8A8072]">{product.fileLabel}</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button onClick={handleStart} disabled={loading} className={primaryBtn}>
          {loading ? "กำลังดำเนินการ..." : "ดำเนินการสั่งซื้อ"}
        </button>
      </div>
    );
  }

  // ---- Auth (register / login) ----
  return (
    <div className={card}>
      <div>
        <h3 className="text-lg font-bold text-[#1C1A17]">สั่งซื้อ {product.name}</h3>
        <p className="mt-1 text-sm text-[#6B6252]">สมัคร/เข้าสู่ระบบ แล้วชำระเงินเพื่อรับลิงก์ดาวน์โหลด</p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F1EBDD] p-1">
        <button
          type="button"
          onClick={() => { setMode("register"); setError(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "register" ? "bg-white text-[#1C1A17] shadow-sm" : "text-[#8A8072]"
          }`}
        >
          สมัครใหม่
        </button>
        <button
          type="button"
          onClick={() => { setMode("login"); setError(null); }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "login" ? "bg-white text-[#1C1A17] shadow-sm" : "text-[#8A8072]"
          }`}
        >
          เข้าสู่ระบบ
        </button>
      </div>

      <form onSubmit={handleAuth} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#4A4239]" htmlFor="checkout-email">อีเมล</label>
          <input
            id="checkout-email"
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
          <label className="text-sm font-medium text-[#4A4239]" htmlFor="checkout-password">รหัสผ่าน</label>
          <input
            id="checkout-password"
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
          {loading
            ? "กำลังดำเนินการ..."
            : mode === "register"
              ? `สมัคร & สั่งซื้อ — ${product.priceThb.toLocaleString()} บาท`
              : "เข้าสู่ระบบ & สั่งซื้อ"}
        </button>
      </form>
    </div>
  );
}
