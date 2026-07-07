import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-auth";
import AdminLoginForm from "@/components/AdminLoginForm";
import AdminKeysDashboard from "@/components/AdminKeysDashboard";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authed = verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-10 sm:px-6">
      <h1 className="bg-gradient-to-r from-[#7bafdb] to-[#4382BB] bg-clip-text text-2xl font-bold text-transparent">
        MIX10 Admin — จัดการคีย์สมาชิก
      </h1>
      {authed ? <AdminKeysDashboard /> : <AdminLoginForm />}
    </main>
  );
}
