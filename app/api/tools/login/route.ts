import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/tools-store";
import {
  TOOLS_COOKIE_MAX_AGE,
  TOOLS_COOKIE_NAME,
  createCustomerSessionToken,
} from "@/lib/tools-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;
  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: { message: "กรุณากรอกอีเมลและรหัสผ่าน" } }, { status: 400 });
  }

  try {
    const customer = await authenticateCustomer(email, password);
    if (!customer) {
      return NextResponse.json({ error: { message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, customer: { email: customer.email } });
    response.cookies.set(
      TOOLS_COOKIE_NAME,
      createCustomerSessionToken({ id: customer.id, email: customer.email }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TOOLS_COOKIE_MAX_AGE,
      }
    );
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" } },
      { status: 500 }
    );
  }
}
