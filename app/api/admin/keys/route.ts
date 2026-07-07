import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { createLicenseKey, listLicenseKeys } from "@/lib/keys";

const VALID_DURATIONS = [3, 7, 30];

function isAuthed(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  try {
    const keys = await listLicenseKeys();
    return NextResponse.json({ keys });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const durationDays = Number(body?.durationDays);
  if (!VALID_DURATIONS.includes(durationDays)) {
    return NextResponse.json({ error: { message: "durationDays must be 3, 7, or 30" } }, { status: 400 });
  }
  try {
    const key = await createLicenseKey(durationDays);
    return NextResponse.json({ key });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}
