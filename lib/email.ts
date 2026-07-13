// Transactional email for the /tools store.
//
// Provider is chosen by which env vars are set (checked in this order):
//   1. Google Apps Script (Gmail)  — set APPSCRIPT_EMAIL_URL (+ APPSCRIPT_EMAIL_SECRET)
//   2. Resend HTTP API             — set RESEND_API_KEY (+ EMAIL_FROM)
//   3. Dev fallback                — none set → emails are logged to the console
// Also used:
//   ADMIN_EMAIL   — where new-order notifications are sent
//   APP_BASE_URL  — public origin used to build absolute download links

import type { ToolOrder } from "./tools-store";
import type { ToolProduct } from "./tools-content";
import { STORE_NAME } from "./tools-content";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export function getBaseUrl(): string {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<{ ok: boolean; dev?: boolean; error?: string }> {
  const appsScriptUrl = process.env.APPSCRIPT_EMAIL_URL;
  const apiKey = process.env.RESEND_API_KEY;

  // 1) Google Apps Script (sends through the connected Gmail account).
  if (appsScriptUrl) {
    try {
      const res = await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Apps Script web apps 302-redirect to googleusercontent.com for the
        // actual response; fetch follows redirects by default.
        redirect: "follow",
        body: JSON.stringify({
          to,
          subject,
          html,
          fromName: process.env.EMAIL_FROM_NAME || STORE_NAME,
          secret: process.env.APPSCRIPT_EMAIL_SECRET || "",
        }),
      });
      const text = await res.text().catch(() => "");
      if (!res.ok) return { ok: false, error: `AppsScript ${res.status}: ${text.slice(0, 200)}` };
      // Script returns {"ok":true} on success, {"ok":false,"error":...} on failure.
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.ok === false) return { ok: false, error: parsed.error || "apps script error" };
      } catch {
        // Non-JSON 200 response — treat as success.
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "apps script send failed" };
    }
  }

  // 2) Resend HTTP API.
  if (apiKey) {
    const from = process.env.EMAIL_FROM || `${STORE_NAME} <onboarding@resend.dev>`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        return { ok: false, error: `Resend ${res.status}: ${detail}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "email send failed" };
    }
  }

  // 3) Dev fallback: no provider configured — log so the flow is observable.
  console.log(`\n[email:dev] → ${to}\n[email:dev] subject: ${subject}\n[email:dev] ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)}\n`);
  return { ok: true, dev: true };
}

function baht(n: number): string {
  return n.toLocaleString("th-TH");
}

function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:'Segoe UI',Tahoma,sans-serif;color:#2a2622;">
    <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fffdf8;border:1px solid #e7e1d5;border-radius:20px;padding:32px;">
        <h1 style="margin:0 0 8px;font-size:20px;color:#1c1a17;">${title}</h1>
        ${bodyHtml}
      </div>
      <p style="text-align:center;color:#9a9081;font-size:12px;margin-top:20px;">${STORE_NAME}</p>
    </div>
  </body></html>`;
}

// Confirmation + download link sent to the customer after payment. Links
// straight to the product's real asset (e.g. the Google Flow tool URL) so it
// works regardless of whether this app's own domain is configured yet.
export async function sendOrderConfirmation(order: ToolOrder, product: ToolProduct): Promise<{ ok: boolean; error?: string }> {
  const downloadLink = product.downloadUrl;
  const html = shell("ขอบคุณสำหรับการสั่งซื้อ 🎉", `
    <p style="font-size:14px;line-height:1.7;color:#4a4239;margin:0 0 16px;">
      คำสั่งซื้อ <strong>#${order.id}</strong> ของคุณเสร็จสมบูรณ์แล้ว กดปุ่มด้านล่างเพื่อดาวน์โหลด
    </p>
    <div style="background:#f4f1ea;border-radius:14px;padding:16px;margin:0 0 20px;">
      <p style="margin:0;font-size:15px;font-weight:700;color:#1c1a17;">${product.name}</p>
      <p style="margin:4px 0 0;font-size:13px;color:#7a7062;">${product.fileLabel} · ${baht(order.amountThb)} บาท</p>
    </div>
    <a href="${downloadLink}" style="display:block;text-align:center;background:#1c1a17;color:#f7f3ea;text-decoration:none;font-weight:700;padding:14px;border-radius:12px;font-size:15px;">
      ดาวน์โหลดไฟล์
    </a>
    <p style="font-size:12px;color:#9a9081;margin:16px 0 0;line-height:1.6;">
      หากปุ่มกดไม่ได้ ให้คัดลอกลิงก์นี้: <br>${downloadLink}
    </p>
    ${product.lineGroupUrl ? `
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #eee7da;">
      <p style="font-size:14px;font-weight:700;color:#1c1a17;margin:0 0 8px;">💬 เข้าไลน์กลุ่มสมาชิก</p>
      <p style="font-size:13px;color:#7a7062;margin:0 0 12px;line-height:1.6;">แพ็กเกจของคุณมีสิทธิ์เข้าไลน์กลุ่ม ถามตอบและรับอัพเดตความรู้ได้ตลอด</p>
      <a href="${product.lineGroupUrl}" style="display:block;text-align:center;background:#f4f1ea;color:#1c1a17;text-decoration:none;font-weight:700;padding:12px;border-radius:12px;font-size:14px;">เข้าไลน์กลุ่ม</a>
    </div>` : ""}
  `);
  return sendEmail({ to: order.customerEmail, subject: `[${STORE_NAME}] ลิงก์ดาวน์โหลด — ${product.name}`, html });
}

// Notification to the store admin when a new order comes in. When
// pendingApproval is true, the order is awaiting the admin's manual approval
// (auto-approve is off); otherwise the customer has already been given access.
export async function sendAdminOrderNotification(
  order: ToolOrder,
  product: ToolProduct,
  opts: { pendingApproval?: boolean } = {}
): Promise<{ ok: boolean; error?: string }> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return { ok: true }; // no admin recipient configured — skip silently

  const pending = Boolean(opts.pendingApproval);
  const heading = pending ? "มีออเดอร์ใหม่ รออนุมัติ ⏳" : "มีออเดอร์ใหม่ (ชำระแล้ว) 🛒";
  const intro = pending
    ? `ลูกค้าแจ้งชำระเงินแล้ว กรุณาตรวจสอบและกดอนุมัติในหน้าแอดมิน (${getBaseUrl()}/admin)`
    : "มีการชำระเงินเข้ามาใหม่ และระบบส่งลิงก์ให้ลูกค้าอัตโนมัติแล้ว";

  const html = shell(heading, `
    <p style="font-size:14px;line-height:1.7;color:#4a4239;margin:0 0 16px;">${intro}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#2a2622;">
      <tr><td style="padding:6px 0;color:#7a7062;">ออเดอร์</td><td style="padding:6px 0;text-align:right;font-weight:700;">#${order.id}</td></tr>
      <tr><td style="padding:6px 0;color:#7a7062;">สินค้า</td><td style="padding:6px 0;text-align:right;">${product.name}</td></tr>
      <tr><td style="padding:6px 0;color:#7a7062;">ยอด</td><td style="padding:6px 0;text-align:right;font-weight:700;">${baht(order.amountThb)} บาท</td></tr>
      <tr><td style="padding:6px 0;color:#7a7062;">ลูกค้า</td><td style="padding:6px 0;text-align:right;">${order.customerEmail}</td></tr>
      <tr><td style="padding:6px 0;color:#7a7062;">สถานะ</td><td style="padding:6px 0;text-align:right;">${pending ? "รออนุมัติ" : "ชำระแล้ว"}</td></tr>
    </table>
  `);
  const subject = pending
    ? `[${STORE_NAME}] ⏳ ออเดอร์ใหม่รออนุมัติ #${order.id} — ${product.name}`
    : `[${STORE_NAME}] ออเดอร์ใหม่ #${order.id} — ${product.name}`;
  return sendEmail({ to: adminEmail, subject, html });
}
