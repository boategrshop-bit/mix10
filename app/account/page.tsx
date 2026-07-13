import Link from "next/link";
import { cookies } from "next/headers";
import { TOOLS_COOKIE_NAME, verifyCustomerSessionToken } from "@/lib/tools-auth";
import { listOrdersByCustomer } from "@/lib/tools-store";
import CustomerAuthPanel from "@/components/tools/CustomerAuthPanel";
import LogoutButton from "@/components/tools/LogoutButton";

export const metadata = { title: "บัญชีของฉัน" };

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const session = verifyCustomerSessionToken(cookieStore.get(TOOLS_COOKIE_NAME)?.value);

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-md px-5 py-16">
        <h1 className="mb-6 text-center text-2xl font-bold text-[#1C1A17]">เข้าสู่ระบบ</h1>
        <CustomerAuthPanel />
      </main>
    );
  }

  const orders = await listOrdersByCustomer(session.id).catch(() => []);
  const paidOrders = orders.filter((o) => o.status === "paid");

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1A17]">บัญชีของฉัน</h1>
          <p className="mt-1 text-sm text-[#8A8072]">{session.email}</p>
        </div>
        <LogoutButton />
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-[#9A9081]">
        คำสั่งซื้อของฉัน
      </h2>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-8 text-center text-sm text-[#8A8072]">
          ยังไม่มีคำสั่งซื้อ ·{" "}
          <Link href="/" className="font-semibold text-[#1C1A17] underline">
            เลือกซื้อเครื่องมือ
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E9E3D6] bg-[#FFFDF8] p-5"
            >
              <div>
                <p className="font-bold text-[#1C1A17]">{o.productName}</p>
                <p className="mt-0.5 text-xs text-[#9A9081]">
                  #{o.id} · {o.amountThb.toLocaleString()} บาท · {formatDate(o.createdAt)}
                </p>
              </div>
              {o.status === "paid" ? (
                <a
                  href={`/download/${o.downloadToken}`}
                  className="rounded-full bg-[#1C1A17] px-5 py-2 text-sm font-semibold text-[#F7F3EA] transition hover:opacity-90"
                >
                  ดาวน์โหลด
                </a>
              ) : (
                <span className="rounded-full bg-[#F1EBDD] px-4 py-1.5 text-xs font-semibold text-[#8A8072]">
                  รอชำระเงิน
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {paidOrders.length > 0 && (
        <p className="mt-6 text-xs text-[#9A9081]">
          ลิงก์ดาวน์โหลดถูกส่งไปที่อีเมลของคุณด้วย หากหาไม่เจอ ลองตรวจในกล่องสแปม
        </p>
      )}
    </main>
  );
}
