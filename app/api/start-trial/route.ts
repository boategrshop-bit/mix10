import { NextRequest, NextResponse } from "next/server";
import { LICENSE_KEY_COOKIE_NAME, claimTrial } from "@/lib/keys";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const result = await claimTrial(getClientIp(request));
    if (!result.ok || !result.code) {
      return NextResponse.json({ error: { message: result.reason ?? "ขอทดลองใช้ไม่สำเร็จ" } }, { status: 429 });
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
