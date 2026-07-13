import { NextRequest, NextResponse } from "next/server";
import { getOrderByToken } from "@/lib/tools-store";
import { getToolById } from "@/lib/tools-content";

// One-time-ish download link delivered by email. Validates the token maps to a
// PAID order, then redirects to the actual asset. The real file URL is never
// exposed until payment is confirmed.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const order = await getOrderByToken(token).catch(() => null);
  if (!order) {
    return new NextResponse("ลิงก์ดาวน์โหลดไม่ถูกต้อง", { status: 404 });
  }
  if (order.status !== "paid") {
    return new NextResponse("คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน", { status: 403 });
  }

  const product = getToolById(order.productId);
  if (!product || !product.downloadUrl || product.downloadUrl === "#") {
    return new NextResponse("ไฟล์ดาวน์โหลดยังไม่พร้อม กรุณาติดต่อแอดมิน", { status: 404 });
  }

  const target = product.downloadUrl.startsWith("http")
    ? product.downloadUrl
    : new URL(product.downloadUrl, request.url).toString();
  return NextResponse.redirect(target);
}
