import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { listOrders } from "@/lib/tools-store";

// Admin: list all orders for the store dashboard.
export async function GET(request: NextRequest) {
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  try {
    const orders = await listOrders();
    return NextResponse.json({ orders });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}
