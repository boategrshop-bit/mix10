"use client";

import { useRef, useState } from "react";
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

// Downscales + re-encodes the slip photo client-side so the upload stays a
// few hundred KB instead of a multi-megabyte phone-camera original.
function compressImage(file: File, maxDim = 1280, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไฟล์นี้ไม่ใช่รูปภาพที่ใช้ได้"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("เบราว์เซอร์นี้ไม่รองรับการประมวลผลรูปภาพ"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

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
  const [slipDataUrl, setSlipDataUrl] = useState<string | null>(null);
  const [slipProcessing, setSlipProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlipProcessing(true);
    setError(null);
    try {
      const compressed = await compressImage(file);
      setSlipDataUrl(compressed);
    } catch (err) {
      setSlipDataUrl(null);
      setError(err instanceof Error ? err.message : "แนบไฟล์สลิปไม่สำเร็จ");
    } finally {
      setSlipProcessing(false);
    }
  }

  async function handlePaid() {
    if (!orderId) return;
    if (!slipDataUrl) {
      setError("กรุณาแนบสลิปโอนเงินก่อนยืนยัน");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, slipDataUrl }),
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
          สแกน QR หรือโอนเข้าบัญชีด้านบน แนบสลิปโอนเงิน แล้วกดปุ่มด้านล่าง ระบบจะส่งลิงก์ดาวน์โหลดเข้าอีเมลทันที
          (ทีมงานจะตรวจสอบยอดอีกครั้งภายหลัง)
        </p>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#4A4239]">สลิปโอนเงิน</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleSlipChange}
            className="hidden"
          />
          {slipDataUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="block w-full overflow-hidden rounded-xl border border-[#E9E3D6] bg-white p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slipDataUrl} alt="สลิปโอนเงินที่แนบ" className="mx-auto max-h-48 rounded-lg object-contain" />
              <span className="mt-2 block text-center text-xs text-[#8A8072]">แตะเพื่อเปลี่ยนรูป</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={slipProcessing}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-[#DED6C6] bg-white px-4 py-6 text-center transition hover:border-[#1C1A17] disabled:opacity-60"
            >
              <span className="text-xl">🧾</span>
              <span className="text-sm font-medium text-[#3A342B]">
                {slipProcessing ? "กำลังประมวลผลรูป..." : "แตะเพื่ออัพโหลดสลิป"}
              </span>
              <span className="text-xs text-[#9A9081]">รองรับไฟล์รูปภาพ</span>
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button onClick={handlePaid} disabled={loading || slipProcessing || !slipDataUrl} className={primaryBtn}>
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
