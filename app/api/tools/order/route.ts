import { NextRequest, NextResponse } from "next/server";
import { TOOLS_COOKIE_NAME, verifyCustomerSessionToken } from "@/lib/tools-auth";
import { createOrder, getCustomerById } from "@/lib/tools-store";
import { getToolById } from "@/lib/tools-content";

// Creates a pending order for the logged-in customer. Called when they start
// checkout for a product; payment confirmation happens separately at /api/tools/pay.
export async function POST(request: NextRequest) {
  const session = verifyCustomerSessionToken(request.cookies.get(TOOLS_COOKIE_NAME)?.value);
  if (!session) {
    return NextResponse.json({ error: { message: "กรุณาเข้าสู่ระบบก่อน" } }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const productId = body?.productId;
  const product = typeof productId === "string" ? getToolById(productId) : undefined;
  if (!product) {
    return NextResponse.json({ error: { message: "ไม่พบสินค้านี้" } }, { status: 400 });
  }

  try {
    const customer = await getCustomerById(session.id);
    if (!customer) {
      return NextResponse.json({ error: { message: "ไม่พบบัญชีลูกค้า" } }, { status: 401 });
    }
    const order = await createOrder(customer, product);
    return NextResponse.json({
      ok: true,
      order: { id: order.id, productId: order.productId, amountThb: order.amountThb, status: order.status },
    });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" } },
      { status: 500 }
    );
  }
}
