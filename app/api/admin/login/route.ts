import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, verifyAdminPassword } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: { message: "กรุณากรอกรหัสผ่าน" } }, { status: 400 });
  }

  let valid: boolean;
  try {
    valid = verifyAdminPassword(password);
  } catch {
    return NextResponse.json(
      { error: { message: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า ADMIN_PASSWORD" } },
      { status: 500 }
    );
  }

  if (!valid) {
    return NextResponse.json({ error: { message: "รหัสผ่านไม่ถูกต้อง" } }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
