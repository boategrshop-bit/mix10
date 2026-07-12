import { NextResponse } from "next/server";
import { TOOLS_COOKIE_NAME } from "@/lib/tools-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TOOLS_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
