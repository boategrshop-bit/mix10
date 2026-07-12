import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import { STORE_NAME } from "@/lib/tools-content";
import ToolsAdminLogin from "@/components/tools/ToolsAdminLogin";
import ToolsAdminDashboard from "@/components/tools/ToolsAdminDashboard";

export const metadata = { title: `${STORE_NAME} — หลังบ้าน` };

export default async function ToolsAdminPage() {
  const cookieStore = await cookies();
  const authed = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-12">
      <h1 className="text-2xl font-bold text-[#1C1A17]">{STORE_NAME} — หลังบ้าน · คำสั่งซื้อ</h1>
      <div className="mt-6">{authed ? <ToolsAdminDashboard /> : <ToolsAdminLogin />}</div>
    </main>
  );
}
