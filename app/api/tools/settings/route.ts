import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getAutoApprove, setAutoApprove } from "@/lib/tools-settings";

function isAuthed(request: NextRequest): boolean {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  try {
    return NextResponse.json({ autoApprove: await getAutoApprove() });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAuthed(request)) {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (typeof body?.autoApprove !== "boolean") {
    return NextResponse.json({ error: { message: "autoApprove ต้องเป็น true/false" } }, { status: 400 });
  }
  try {
    await setAutoApprove(body.autoApprove);
    return NextResponse.json({ ok: true, autoApprove: body.autoApprove });
  } catch (err) {
    return NextResponse.json(
      { error: { message: err instanceof Error ? err.message : "Database error" } },
      { status: 500 }
    );
  }
}
