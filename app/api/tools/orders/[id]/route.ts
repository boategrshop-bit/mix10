import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getOrderById, markOrderPaid, markOrderEmailSent } from "@/lib/tools-store";
import { getToolById } from "@/lib/tools-content";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";

function isAuthed(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

// Admin actions on a single order:
//   { action: "mark-paid" }  → mark paid + send the download email
//   { action: "resend" }     → re-send the download email to the customer
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: { message: "Invalid id" } }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;

  try {
    const existing = await getOrderById(numericId);
    if (!existing) {
      return NextResponse.json({ error: { message: "ไม่พบคำสั่งซื้อ" } }, { status: 404 });
    }
    const product = getToolById(existing.productId);
    if (!product) {
      return NextResponse.json({ error: { message: "ไม่พบสินค้าของคำสั่งซื้อนี้" } }, { status: 400 });
    }

    if (action === "mark-paid") {
      const order = await markOrderPaid(numericId);
      if (!order) return NextResponse.json({ error: { message: "อัปเดตไม่สำเร็จ" } }, { status: 500 });
      const emailed = await sendOrderConfirmation(order, product);
      if (emailed.ok) await markOrderEmailSent(order.id);
      await sendAdminOrderNotification(order, product);
      return NextResponse.json({ ok: true, emailSent: emailed.ok });
    }

    if (action === "resend") {
      const emailed = await sendOrderConfirmation(existing, product);
      if (emailed.ok) await markOrderEmailSent(existing.id);
      return NextResponse.json({ ok: true, emailSent: emailed.ok, error: emailed.error });
    }

    return NextResponse.json({ error: { message: "ไม่รู้จักคำสั่ง" } }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}
