import { NextRequest, NextResponse } from "next/server";
import { TOOLS_COOKIE_NAME, verifyCustomerSessionToken } from "@/lib/tools-auth";
import { getOrderById, markOrderPaid, markOrderEmailSent } from "@/lib/tools-store";
import { getAutoApprove } from "@/lib/tools-settings";
import { getToolById } from "@/lib/tools-content";
import { sendOrderConfirmation, sendAdminOrderNotification } from "@/lib/email";

// Customer payment confirmation. Behaviour depends on the store's auto-approve
// setting (toggled by the admin):
//   auto-approve ON  → mark paid, email the link to the customer immediately
//   auto-approve OFF → leave pending, notify the admin to review & approve
export async function POST(request: NextRequest) {
  const session = verifyCustomerSessionToken(request.cookies.get(TOOLS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: { message: "กรุณาเข้าสู่ระบบก่อน" } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const orderId = Number(body?.orderId);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: { message: "ไม่พบคำสั่งซื้อ" } }, { status: 400 });
  }

  try {
    const existing = await getOrderById(orderId);
    if (!existing || existing.customerId !== session.id) {
      return NextResponse.json({ error: { message: "ไม่พบคำสั่งซื้อของคุณ" } }, { status: 404 });
    }
    const product = getToolById(existing.productId);
    if (!product) {
      return NextResponse.json({ error: { message: "ไม่พบสินค้าของคำสั่งซื้อนี้" } }, { status: 400 });
    }

    const autoApprove = await getAutoApprove();

    if (!autoApprove) {
      // Manual approval: keep the order pending and ask the admin to review.
      await sendAdminOrderNotification(existing, product, { pendingApproval: true });
      return NextResponse.json({ ok: true, approved: false });
    }

    // Auto-approve: mark paid, email the link to the customer, notify the admin.
    // Email failure must not block access — the customer still gets the on-screen link.
    const order = await markOrderPaid(orderId);
    if (!order) {
      return NextResponse.json({ error: { message: "ยืนยันการชำระเงินไม่สำเร็จ" } }, { status: 500 });
    }
    const emailed = await sendOrderConfirmation(order, product);
    if (emailed.ok) await markOrderEmailSent(order.id);
    await sendAdminOrderNotification(order, product);

    return NextResponse.json({
      ok: true,
      approved: true,
      downloadPath: `/tools/download/${order.downloadToken}`,
      emailSent: emailed.ok,
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" } },
      { status: 500 }
    );
  }
}
