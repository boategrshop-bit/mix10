import { NextRequest, NextResponse } from "next/server";
import { LICENSE_KEY_COOKIE_NAME, checkKeyValid } from "./keys";
import type { ApiErrorBody } from "./types";

// If DATABASE_URL isn't configured (e.g. local development without Postgres
// set up yet), the license-key system is treated as not-yet-enabled and every
// request is allowed through. Once DATABASE_URL is set (Railway production),
// this enforces a valid, non-expired, non-revoked key on every request.
export async function requireValidLicenseKey(request: NextRequest): Promise<NextResponse | null> {
  if (!process.env.DATABASE_URL) return null;

  const code = request.cookies.get(LICENSE_KEY_COOKIE_NAME)?.value;
  const valid = code ? await checkKeyValid(code) : false;
  if (valid) return null;

  const body: ApiErrorBody = {
    error: { code: "license_required", message: "กรุณากรอกคีย์สมาชิกที่หน้าเว็บก่อนใช้งาน" },
  };
  return NextResponse.json(body, { status: 401 });
}
