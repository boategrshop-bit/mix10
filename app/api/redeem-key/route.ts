import { NextRequest, NextResponse } from "next/server";
import { LICENSE_KEY_COOKIE_NAME, redeemLicenseKey } from "@/lib/keys";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const key = body?.key;
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: { message: "กรุณากรอกคีย์" } }, { status: 400 });
  }

  try {
    const result = await redeemLicenseKey(key);
    if (!result.ok || !result.code) {
      return NextResponse.json({ error: { message: result.reason ?? "คีย์ไม่ถูกต้อง" } }, { status: 400 });
    }
    const response = NextResponse.json({ ok: true, expiresAt: result.expiresAt });
    response.cookies.set(LICENSE_KEY_COOKIE_NAME, result.code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "เกิดข้อผิดพลาด กรุณาลองใหม่" } },
      { status: 500 }
    );
  }
}
