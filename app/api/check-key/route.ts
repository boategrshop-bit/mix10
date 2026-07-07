import { NextRequest, NextResponse } from "next/server";
import { LICENSE_KEY_COOKIE_NAME, checkKeyValid } from "@/lib/keys";

export async function GET(request: NextRequest) {
  // If DATABASE_URL isn't configured yet (e.g. local development), the
  // license-key system is treated as not-yet-enabled and access is allowed.
  if (!process.env.DATABASE_URL) return NextResponse.json({ valid: true });

  const code = request.cookies.get(LICENSE_KEY_COOKIE_NAME)?.value;
  if (!code) return NextResponse.json({ valid: false });
  try {
    const valid = await checkKeyValid(code);
    return NextResponse.json({ valid });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
